//"use strict";

import "./../style/visual.less";
import powerbiVisualsApi from "powerbi-visuals-api";
import { AdvancedFilter, FilterType } from "powerbi-models";
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import DataView = powerbiVisualsApi.DataView;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;
import IFilter = powerbiVisualsApi.IFilter;

import * as d3 from "d3";
import { select as d3Select, selectAll as d3SelectAll, Selection as D3Selection, } from "d3-selection";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
import {
    ICalendarProperties,
    ICalendarMargins
} from "./interfaces"
import { Utils } from "./utils";
import { filter } from "d3";

export class Calendar implements IVisual {
    private arrowDown: D3Selection<any, any, any, any>;
    private arrowUp: D3Selection<any, any, any, any>;
    private calendarContainer: D3Selection<any, any, any, any>;
    private calendarIconEndDate: D3Selection<any, any, any, any>;
    private calendarIconStartDate: D3Selection<any, any, any, any>;
    private calendarInputEnabled: boolean = false;
    private calendarInteractive: boolean = false;
    private calendarProperties: ICalendarProperties
    private calendarSvg: Selection<SVGElement>;
    private currentMonth: number;
    private currentYear: number;
    private dataView: powerbiVisualsApi.DataView;
    private static categories: powerbiVisualsApi.DataViewCategoryColumn[] | undefined
    private customDateContainer: D3Selection<any, any, any, any>;
    private static dateField: powerbiVisualsApi.DataViewMetadataColumn | undefined;
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    private dateSelected: boolean = false;
    //private defaultDatesApplied: boolean = false;
    private static DefaultTextXOffset: number = 5;
    private static DefaultTextYOffset: number = 20;
    private endDate: Date = Utils.normaliseEndDate(new Date());
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private highlightEnd: Date | null = null;
    private highlightStart: Date | null = null;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[]=[];
    private options: powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
    private previousStartDate: Date = Utils.normaliseStartDate(new Date());
    private previousEndDate: Date = Utils.normaliseEndDate(new Date());
    private selectedDateRange: string = "Today";
    private startDate: Date = Utils.normaliseStartDate(new Date(2025, 0, 1));
    private startDateInput: HTMLInputElement;
    private startDateInputContainer: D3Selection<any, any, any, any>;
    private rootSelection: D3Selection<any, any, any, any>;
    private targetInput: HTMLInputElement | null = null;

    private static CalendarMargins: ICalendarMargins = {
        LeftMargin: 20,
        RightMargin: 20,
        TopMargin: 40,
        BottomMargin: 20,
        CellWidth: 40,
        CellHeight: 40,
        CellPadding: 4,
        StartXpoint: 0,
        StartYpoint: 20,
        HeaderHeight: 30,
        WeekdayLabelHeight: 20
    }
    
    
    //Power BI sends auto-date hierarchy range 01/01/2020 to 31/12/2030
    //This function equires turning off 'Auto Date/TIme' in Power BI Options
    private intialiseStartAndEndDates(categories: powerbiVisualsApi.DataViewCategoryColumn[]): void {
         console.log("intialiseStartAndEndDates (before running code) - this.startDate, this.endDate should be undefined", this.startDate, this.endDate)
        // Find the column index with the 'Time' role
        const dateColIndex = categories.findIndex(category => category.source.roles && category.source.roles["Time"]);
        //console.log("dateColIndex", dateColIndex);
        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        if (dateColIndex !== -1) {
            //Calendar.dateField = tableColumns[dateColIndex];
            const dateValues = categories[dateColIndex]?.values; //DataViewTableRow
            //console.log("dateValues", dateValues);
            if (!dateValues) {
                console.log("No date values found");
                return;
            }

            //console.log("this.dateField", Calendar.dateField);
            // Extract all date values from the rows for this column
            const dates: Date[] = dateValues
                .filter(d => d != null)
                .map(d => new Date(d as string));
            //console.log("dates", dates); // Check all dates currently in your visual 
            // Example: set min and max for your date picker
            minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        } else {
            minDate = new Date();
            maxDate = new Date();
        }
        this.startDate = Utils.normaliseEndDate(minDate);
        this.endDate = Utils.normaliseEndDate(maxDate);
        this.previousStartDate = new Date(this.startDate);
        this.previousEndDate = new Date(this.endDate);
        this.startDateInput.min = Utils.formatDate(minDate);
        this.endDateInput.max = Utils.formatDate(maxDate);
        // Optional: set default values to the full range 
        this.startDateInput.value = Utils.formatDate(minDate);
        this.endDateInput.value = Utils.formatDate(maxDate);
        console.log("initialiseDateInput -minDate: ", minDate, "maxDate", maxDate);
    }

    private applyDateRange(range: string) {
        const today: Date = Utils.normaliseStartDate(new Date());
        this.previousStartDate = new Date(this.startDate);
        this.previousEndDate = new Date(this.endDate);
        this.dateSelected = true;
        console.log("applyDateRange - range, this.dateSelected, this.selectedDateRange: ", range, this.dateSelected, this.selectedDateRange);
        this.selectedDateRange = range;

        if (range === "Custom") {
            // Show calendar so user can pick a date 
            this.calendarInputEnabled = true;
        } else {
            this.calendarInputEnabled = false;
            this.updateCalendarVisibility(false); // hide calendar 
        }

        switch (range) {
            case "Today":
                this.currentMonth = today.getMonth();
                this.currentYear = today.getFullYear();
                this.startDate = new Date(today);
                const endofToday = new Date(today);
                this.endDate = Utils.normaliseEndDate(endofToday);
                break;
            case "Yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                this.currentMonth = yesterday.getMonth();
                this.currentYear = yesterday.getFullYear();
                this.startDate = new Date(yesterday);
                const endofYesterday = new Date(yesterday);
                this.endDate = Utils.normaliseEndDate(endofYesterday);
                // For single day ranges, just jump to the month containing that day
                break;
            case "This Week":
            case "Last Week":
                // For week ranges, just jump to the month containing Monday of that week
                const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon,...6=Sat 
                // Offset so Monday is always the first day 
                const weekStartOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                const monday = new Date(today);
                monday.setDate(today.getDate() - weekStartOffset);
                if (range === "Last Week") {
                    monday.setDate(monday.getDate() - 7);
                }
                const sunday = Utils.normaliseEndDate(new Date(monday));
                sunday.setDate(monday.getDate() + 6);
                this.currentMonth = monday.getMonth();
                this.currentYear = monday.getFullYear();
                this.startDate = new Date(monday);
                this.endDate = new Date(sunday);
                break;
            case "This Month":
                this.currentMonth = today.getMonth();
                this.currentYear = today.getFullYear();
                this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                const endDateThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.endDate = Utils.normaliseEndDate(endDateThisMonth);
                break;
            case "Last Month":
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                this.currentMonth = lastMonth.getMonth();
                this.currentYear = lastMonth.getFullYear();
                this.startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const endDateLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                this.endDate = Utils.normaliseEndDate(endDateLastMonth);
                break;
            case "This Year":
                //console.log("applyDateRange - This Year - today:", today);
                this.currentMonth = today.getMonth();
                this.currentYear = today.getFullYear();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                this.endDate = Utils.normaliseEndDate(endOfYear);
                break;
            case "Last Year":
                const lastYear = new Date(today.getFullYear() - 1, 0, 1);
                this.currentMonth = lastYear.getMonth();
                this.currentYear = lastYear.getFullYear();
                this.startDate = new Date(lastYear);
                const endOfLastYear = new Date(lastYear.getFullYear(), 11, 31);
                this.endDate = Utils.normaliseEndDate(endOfLastYear);
                break;
            case "Custom":
                break;
            default:
                console.log("Unknown date range selected");
        }

        this.startDateInput.value = Utils.formatDate(this.startDate);
        this.endDateInput.value = Utils.formatDate(this.endDate);
        this.highlightStart = new Date(this.startDate);
        this.highlightEnd = new Date(this.endDate);        
        console.log("applyDateRange - this.startDate", this.startDate, "this.endDate", this.endDate, "tthis.highlightStart", this.highlightStart, "this.highlightEnd", this.highlightEnd);
    }

    private datePeriodChanged() {
        console.log("datePeriodChanged - this.previousStartDate, this.previousEndDate", this.previousStartDate, this.previousEndDate)
        if(!this.previousStartDate || !this.previousEndDate) return false
        const hasChanged = (this.previousStartDate.getTime() !== this.startDate.getTime())
            || (this.previousEndDate.getTime() !== this.endDate.getTime());
        console.log("datePeriodChanged - hasChanged", hasChanged, "this.previousStartDate", this.previousStartDate, "this.startDate", this.startDate, "this.previousEndDate", this.previousEndDate, "this.endDate", this.endDate);
        return hasChanged;
    }

    public getFilterAction(startDate: Date, endDate: Date): powerbiVisualsApi.FilterAction {
        return startDate !== undefined
            && endDate !== undefined
            && startDate !== null
            && endDate !== null
            ? powerbiVisualsApi.FilterAction.merge
            : powerbiVisualsApi.FilterAction.remove;
    }

    private applyFilter(datefield: any, startDate: Date, endDate: Date) {
        console.log("applyFilter - startDate: ", startDate, ", endDate: ", endDate);
        //console.log("Calendar.dateField", datefield);
        if (datefield) {
            //console.log("applyFilter - datefield.displayName", datefield.displayName, "datefield.queryName", datefield.queryName);
            // Create filter
            const filter = new AdvancedFilter(
                {
                    table: datefield.queryName.split(".")[0],
                    column: datefield.queryName.split(".")[1]
                },
                "And",
                {
                    operator: "GreaterThanOrEqual",
                    value: startDate.toISOString()
                },
                {
                    operator: "LessThanOrEqual",
                    value: endDate.toISOString()
                });

            this.jsonFilters = [filter];
            this.host.applyJsonFilter(
                filter,
                "general",
                "filter",
                this.getFilterAction(this.startDate, this.endDate)
            );

            //console.log(filter)
        }
    }

    private drawCalendar2(): void { 

        if (!this.calendarSvg) return; 
        const props = this.calendarProperties; 
        const startX = props.startXpoint + props.leftMargin; 
        const startY = props.startYpoint + props.topMargin; 
        // Clear any existing calendar elements 
        this.calendarSvg.selectAll("*").remove(); 

        // Set SVG width/height 
        this.calendarSvg 
            .attr("width", 7 * props.cellWidth + props.leftMargin + props.rightMargin) 
            .attr("height", 7 * props.cellHeight + props.topMargin + props.bottomMargin); 

            // Month label 

        const monthNames = [ 
            "January","February","March","April","May","June", "July","August","September","October","November","December" 
        ]; 
        this.calendarSvg.append("text") 
            .attr("x", startX + (props.daysInWeek * props.cellWidth)/2) 
            .attr("y", startY - props.weekdayLabelHeight) 
            .attr("text-anchor", "middle") 
            .attr("font-size", "18px") 
            .attr("fill", "#255A91") 
            .text(`${monthNames[this.currentMonth]} ${this.currentYear}`); 

        // Weekday labels 
        const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; 
        this.calendarSvg.selectAll(".weekdayLabel") 
            .data(weekdays) 
            .enter() 
            .append("text") 
            .classed("weekdayLabel", true) 
            .attr("x", (d, i) => startX + i * props.cellWidth + props.textXOffset) 
            .attr("y", startY - props.weekdayLabelHeight / 2) 
            .attr("font-size", "14px") 
            .attr("fill", "#255A91") 
            .text(d => d); 

        // Calculate day cells 

        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.currentYear, this.currentMonth); 
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.currentYear, this.currentMonth); 
        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); // make Monday first 
        let daysArray: { day: number, inMonth: boolean, date: Date }[] = []; 

        // Previous month trailing days 
        const prevMonthDays = Utils.getNumberofDaysInPrevMonth(this.currentYear, this.currentMonth); 
        for (let i = 0; i < firstDayOfMonth; i++) { 
            const date = new Date(this.currentYear, this.currentMonth - 1, prevMonthDays - firstDayOfMonth + i + 1); 
            daysArray.push({ day: date.getDate(), inMonth: false, date }); 
        } 

        // Current month 
        for (let d = 1; d <= daysInMonth; d++) { 
            const date = new Date(this.currentYear, this.currentMonth, d); 
            daysArray.push({ day: d, inMonth: true, date }); 
        } 


        // Next month leading days until 42 cells 
        let nextDay = 1; 
        while (daysArray.length < 42) { 
            const date = new Date(this.currentYear, this.currentMonth + 1, nextDay++); 
            daysArray.push({ day: date.getDate(), inMonth: false, date }); 
        } 
    
        // Render day cells 
        const dayGroups = this.calendarSvg.selectAll(".dayGroup") 
            .data(daysArray) 
            .enter() 
            .append("g") 
            .classed("dayGroup", true) 
            .attr("transform", (d, i) => { 
                const x = startX + (i % props.daysInWeek) * props.cellWidth; 
                const y = startY + Math.floor(i / props.daysInWeek) * props.cellHeight; 
                return `translate(${x}, ${y})`; 
            }); 
    
        // Highlight selected range 
        const inHighlightRange = (date: Date) => { 
            if (!this.highlightStart || !this.highlightEnd) return false; 
            return date >= this.highlightStart && date <= this.highlightEnd; 
        }; 
    
        dayGroups.append("rect") 
            .attr("width", props.cellWidth - props.cellPadding) 
            .attr("height", props.cellHeight - props.cellPadding) 
            .attr("fill", d => inHighlightRange(d.date) ? "#B3D1F0" : "#ffffff") 
            .attr("stroke", "#ccc"); 
    
        // Day number text 
        dayGroups.append("text") 
            .attr("x", props.textXOffset) 
            .attr("y", props.textYOffset) 
            .attr("font-size", "12px") 
            .attr("fill", d => d.inMonth ? "#255A91" : "#999") 
            .text(d => d.day); 
    

        // Click to select date 
        dayGroups.on("click", (event, d) => { 
            if (!this.calendarInteractive || !this.targetInput) return; 
            this.targetInput.value = Utils.formatDate(d.date); 
            this.highlightStart = new Date(d.date); 
            this.calendarInteractive = false; 
            this.updateCalendarVisibility(false); 
            this.targetInput = null; 
        }); 
    } 

    private drawCalendar(options: VisualUpdateOptions): void{
        this.calendarSvg.selectAll("*").remove();
        if (!this.calendarSvg || !options) {
            console.log("Either calender svg or options is not available", this.calendarSvg,"options", options);
            return;
        }
        let today = new Date();
        today = Utils.normaliseStartDate(today);
        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let props = this.calendarProperties;
        let startX = props.startXpoint + props.leftMargin;
        let startY = props.startYpoint + props.topMargin;
        let weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

        this.calendarSvg
            .attr("width", width)
            .attr("height", height);

        const displayMonth = (monthIndex: number): string => {
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            return monthNames[monthIndex];
        };
        this.calendarSvg
            .append("text")
            .classed("monthLabel", true)
            .attr("x", startX + 30)
            .attr("y", startY - props.weekdayLabelHeight - 20)
            .attr("dx", (props.daysInWeek * props.cellWidth) / 2 - props.cellWidth / 2)
            .text(displayMonth(this.currentMonth) + " " + this.currentYear);

        //let monthLabelWidth = (props.daysInWeek * props.cellWidth);
        this.arrowUp
            .attr("x", startX + props.daysInWeek * props.cellWidth - 100)
            .attr("y", startY - props.weekdayLabelHeight - 50)
            .text("▲")

        this.calendarSvg
            .append("text")
            .classed("arrowDown", true)
            .attr("x", startX + props.daysInWeek * props.cellWidth - 75)
            .attr("y", startY - props.weekdayLabelHeight - 25)
            .text("▼")//("↓")
            .on("click", () => {
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.update(options); // redraw
            });


        this.calendarSvg.selectAll(".weekdayLabel")
            .data(weekdays)
            .enter()
            .append("text")
            .classed("weekdayLabel", true)
            .attr("x", (d, i) => startX + i * props.cellWidth + props.textXOffset)
            .attr("y", startY - props.weekdayLabelHeight)
            .attr("font-size", "14px")
            .attr("fill", "#255A91")
            .text(d => d);


        let totalDays = props.daysInWeek * props.weeksInMonth; // 42 slots
        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.currentYear, this.currentMonth);
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.currentYear, this.currentMonth); // 0=Sun, 1=Mon, ..., 6=Sat

        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
        //firstDayOfMonth = (firstDayOfMonth + 6) % 7;
        const daysInPrevMonth = Utils.getNumberofDaysInPrevMonth(this.currentYear, this.currentMonth);

        let daysArray: { day: number, inMonth: boolean, date: Date }[] = [];
        // Fill previous month's trailing days

        for (let i = 0; i < firstDayOfMonth; i++) {
            const date = new Date(this.currentYear, this.currentMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1);
            daysArray.push({
                day: date.getDate(),
                inMonth: false,
                date
            });

        }
        // Fill current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this.currentYear, this.currentMonth, d);
            daysArray.push({ day: d, inMonth: true, date });
        }
        // Fill next month leading days until 42 cells
        let nextDay = 1;
        while (daysArray.length < 42) {
            const date = new Date(this.currentYear, this.currentMonth + 1, nextDay++);
            daysArray.push({ day: date.getDate(), inMonth: false, date });
        }

        const dayGroups = this.calendarSvg.selectAll(".dayGroup")
            .data(daysArray)
            .enter()
            .append("g")
            .classed("dayGroup", true)
            .attr("transform", (d, i) => {
                const x = startX + (i % props.daysInWeek) * props.cellWidth;
                const y = startY + Math.floor(i / props.daysInWeek) * props.cellHeight;
                return `translate(${x}, ${y})`;
            });

        // Function to check if a date is within the highlight range
        const inHighlightRange = (cellDate: Date): boolean => {
            if (!this.highlightStart || !this.highlightEnd) return false;
            return cellDate >= this.highlightStart && cellDate <= this.highlightEnd;
        };
        // Background rect
        dayGroups.append("rect")
            .classed("dayCell", true)
            .attr("width", props.cellWidth - props.cellPadding)
            .attr("height", props.cellHeight - props.cellPadding)
            .style("fill", d => {
                if (inHighlightRange(d.date)) {
                    return "#B3D1F0"; // highlight color
                }
                return "#ffffff"; // normal
            });

        // Circle for today
        dayGroups.filter(d =>
            d.inMonth &&
            this.currentYear === today.getFullYear() &&
            this.currentMonth === today.getMonth() &&
            d.day === today.getDate()
        ).append("circle")
            .attr("cx", (props.cellWidth - props.cellPadding) / 2)
            .attr("cy", (props.cellHeight - props.cellPadding) / 2)
            .attr("r", Math.min(props.cellWidth, props.cellHeight) / 2 - props.cellPadding)
            .style("fill", "#255A91")
        //.style("opacity", 0.2);

        // Day number text
        dayGroups.append("text")
            .classed("dayNumber", true)
            .attr("x", props.textXOffset)
            .attr("y", props.textYOffset)
            .attr("font-size", "12px")
            //.attr("fill", "#")
            .style("fill", d => d.inMonth ? "#255A91" : "#999")
            .style("font-weight", d =>
                d.inMonth &&
                    this.currentYear === today.getFullYear() &&
                    this.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "bold" : "normal")
            .style("fill", d =>
                d.inMonth &&
                    this.currentYear === today.getFullYear() &&
                    this.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "white" : d.inMonth ? "#255A91" : "#999")
            .text(d => d.day);

        dayGroups.on("click", (event, d) => {
            if (!this.calendarInteractive) return;
            this.targetInput.value = Utils.formatDate(d.date);
            this.calendarInteractive = false;  // hide calendar after selection
            this.highlightStart = new Date(d.date);
            //this.startDateInput.value = event.target.id === "startInput" ? Utils.formatDate(d.date) : this.startDateInput.value;
            //this.endDateInput.value = event.target.id === "endInput" ? Utils.formatDate(d.date) : this.endDateInput.value;
            this.updateCalendarVisibility(false);
            this.targetInput = null;
        });
        this.updateCalendarVisibility(this.calendarInteractive);
    }


    //better 
    private refreshCalendar() { 
        if (!this.dataView) return; 
        this.update({ 
            type: powerbiVisualsApi.VisualUpdateType.Data | powerbiVisualsApi.VisualUpdateType.Resize, 
            viewport: { 
                width: this.calendarSvg.node()?.clientWidth || 500, 
                height: this.calendarSvg.node()?.clientHeight || 400 
            }, 
            viewMode: undefined, 
            dataViews: [this.dataView], // pass the actual data 
            jsonFilters: this.jsonFilters 
        }); 
    } 

    private updateCalendarVisibility(isVisible: boolean) {
        this.calendarInteractive = isVisible;
        this.calendarContainer.style("display", this.calendarInteractive ? "block" : "none");
    }

    // Look private static TimelineSelectors: ITimelineSelectors

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        const element: HTMLElement = options.element;
        this.rootSelection = d3Select(element)
            .append("div")
            .classed("calendarRoot", true)
        this.dateRangeContainer = this.rootSelection
            .append("div")
            .classed("dropDownContainer", true)
        this.dateRangeContainer
            .append("div")
            .classed("containerLabel", true)
            .text("Day, Week, Month, Year");
        this.dateRangeDropDown = this.dateRangeContainer
            .append("select")
            .classed("dateRangeDropdown", true);
        const ranges = ["Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month", "This Year", "Last Year", "Custom"];
        this.dateRangeDropDown
            .selectAll("option")
            .data(ranges)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
            .property("selected", d => d === this.selectedDateRange);
        //this.dateRangeDropDown.selectAll("*").remove();
        //.attr("id", "dateRangeDropdown")                  
        this.dateRangeDropDown
            .on("change", (event: any) => {
                const selectElement = event.target as HTMLSelectElement;
                const value = selectElement.value;
                this.selectedDateRange = value;
                //this.determineStartEndDates(value);
                this.customDateContainer
                    .style("pointer-events", value === "Custom" ? "auto" : "none")
                    .style("opacity", value === "Custom" ? 1 : 0.5)
                this.applyDateRange(value);
                this.applyFilter(Calendar.dateField, this.startDate, this.endDate);
            });
        this.customDateContainer = this.rootSelection
            .append("div")
            .classed("customDateContainer disabled", true);
        this.customDateContainer
            .append("div")
            .classed("containerLabel", true)
            .text("Custom Date:");
        this.dateInputContainer = this.customDateContainer
            .append("div")
            .classed("dateInputContainer", true)
        this.startDateInputContainer = this.dateInputContainer
            .append("div")
            .classed("startDateInputContainer", true)
        this.startDateInput = this.startDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "startInput")
            .node() as HTMLInputElement;
        //this.startDateInput.value = Utils.formatDate(this.today);
        // Calendar icon (using Unicode or SVG) 
        this.calendarIconStartDate = this.startDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            //.style("cursor", "pointer")            
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.startDateInput;
                    this.highlightStart = new Date(this.targetInput.value);
                    this.updateCalendarVisibility(true); // show calendar  
                        if (this.options) this.drawCalendar(this.options);
                }
                //console.log("calendarIconStartDate", this.calendarInputEnabled, this.targetInput.value, this.calendarInteractive);
            });
        this.endDateInputContainer = this.dateInputContainer
            .append("div")
            .classed("endDateInputContainer", true)
        // Initialize with today's date 
        this.endDateInput = this.endDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "endInput")
            .node() as HTMLInputElement;
        //this.endDateInput.value = Utils.formatDate(this.today);
        this.calendarIconEndDate = this.endDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            //.style("cursor", "pointer")
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.endDateInput;
                    this.highlightEnd = new Date(this.targetInput.value);
                    this.updateCalendarVisibility(true); // show calendar 
                    if (this.options) this.drawCalendar(this.options);
                }
                //console.log("calendarIconStartDate", this.calendarInputEnabled, this.targetInput.value, this.calendarInteractive);
                });

        this.calendarContainer = this.rootSelection
            .append("div")
            .classed("calendarContainer", true)            
            .style("display", "none"); // initially hidden
            /*.on("click", (event: any) => {
                // Click outside calendar to close
                if (this.calendarInteractive && this.targetInput) {
                    const isClickInside = (event.target === this.targetInput) || (event.target === this.calendarIconStartDate.node()) || (event.target === this.calendarIconEndDate.node());
                    if (!isClickInside) {
                        this.calendarInteractive = false;
                        this.updateCalendarVisibility(false);
                        this.targetInput = null;
                    }
                }
            });*/
        this.calendarSvg = this.calendarContainer
            .append('svg')
            .classed('calendarSvg', true)
        
        this.arrowUp = this.calendarSvg
            .append("text")
            .classed("arrowUp", true)
            .on("click", () => {
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.options && this.update(this.options); // redraw
            });

            this.arrowUp.attr("fill", "red").attr("font-size", 50); 
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        //this.calendarProperties = { ...Calendar.CalendarMargins } as ICalendarProperties; 
        this.calendarProperties = {
            topMargin: Calendar.CalendarMargins.TopMargin,
            bottomMargin: Calendar.CalendarMargins.BottomMargin,
            leftMargin: Calendar.CalendarMargins.LeftMargin,
            rightMargin: Calendar.CalendarMargins.RightMargin,
            // cell dimensions (each day box) 
            cellWidth: Calendar.CalendarMargins.CellWidth,    // width of a single day cell 
            cellHeight: Calendar.CalendarMargins.CellHeight,  // height of a single day cell 
            cellPadding: Calendar.CalendarMargins.CellPadding, // inner spacing 
            // grid layout (rows = weeks, cols = days) 
            daysInWeek: 7,
            weeksInMonth: 6, // typical calendar grid 
            startXpoint: Calendar.CalendarMargins.StartXpoint,
            startYpoint: Calendar.CalendarMargins.StartYpoint,
            // header/legend 
            headerHeight: Calendar.CalendarMargins.HeaderHeight, // month name or day labels 
            weekdayLabelHeight: Calendar.CalendarMargins.WeekdayLabelHeight,

            // text positioning 
            textXOffset: Calendar.DefaultTextXOffset,
            textYOffset: Calendar.DefaultTextYOffset,
        };
        //this.updateCalendarVisibility();

    }

    public update(options: VisualUpdateOptions) {
d3.selectAll(".arrowUp").nodes() 
        this.options = options;
        this.dataView = options.dataViews && options.dataViews[0];
        console.log("*******OPTIONS*******", this.options);
        //console.log("update - this.dateSelected", this.dateSelected, "this.selectedDateRange", this.selectedDateRange);
        //this.calendarSvg.selectAll("*").remove();
        //console.log("this.startDate", this.startDate, "this.endDate", this.endDate);
        //this.applyDateRange(this.selectedDateRange);
        if (!options.dataViews || options.dataViews.length === 0) {
            console.log("No dateViews");
            return;
        }
        const dataView: DataView = options.dataViews[0];
        //console.log("dataView", dataView);

        

        Calendar.dateField = dataView.metadata.columns.find(col => col.roles && col.roles["Time"]);
        if (!Calendar.dateField) {
            console.log("No dateField found");
            return;
        }

        if (!dataView.categorical) {
            console.log("No categorical data found");
            return;
        }

        Calendar.categories = dataView.categorical.categories as powerbiVisualsApi.DataViewCategoryColumn[];
        if (! Calendar.categories ||  Calendar.categories.length === 0) {
            console.log("No categories found");
            return;
        }

        if (!this.dateSelected) {
            !this.dateSelected && console.log("No date selected", this.dateSelected, this.selectedDateRange)
            //this.intialiseStartAndEndDates(Calendar.categories);
            this.applyDateRange(this.selectedDateRange);
            this.applyFilter(Calendar.dateField, this.startDate, this.endDate);
        }

        if (this.datePeriodChanged()) {
            console.log("Date period has changed", this.datePeriodChanged());
            this.applyDateRange(this.selectedDateRange);
            this.applyFilter(Calendar.dateField, this.startDate, this.endDate);
        }

             
        

        

        
        
        // If you want to redraw your calendar 
        //this.updateCalendar(options);
        //console.log("Visual update called", options);
        //console.log("min and max date", this.startDateInput.min, this.endDateInput.max);

        //this.drawCalendar(options);

        /*this.calendarIconStartDate
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.startDateInput;
                    this.highlightStart = new Date(this.targetInput.value);
                    this.updateCalendarVisibility(true); // show calendar  
                        if (this.options) this.drawCalendar(this.options);
                }
                //console.log("calendarIconStartDate", this.calendarInputEnabled, this.targetInput.value, this.calendarInteractive);
            });*/
        
        /*this.calendarIconEndDate  
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.endDateInput;
                    this.highlightEnd = new Date(this.targetInput.value);
                    this.updateCalendarVisibility(true); // show calendar 
                    if (this.options) this.drawCalendar(this.options);
                }
                //console.log("calendarIconStartDate", this.calendarInputEnabled, this.targetInput.value, this.calendarInteractive);
                });*/
                
        console.log("End of update ************************************");
    }


}
