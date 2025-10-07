//"use strict";

import powerbiVisualsApi from "powerbi-visuals-api";
import { AdvancedFilter, FilterType } from "powerbi-models";
import * as d3 from "d3";
import { select as d3Select, selectAll as d3SelectAll, Selection as D3Selection, } from "d3-selection";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import DataView = powerbiVisualsApi.DataView;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;

import "./../style/visual.less";
import {
    ICalendarDatePeriods,
    ICalendarMargins,
    ICalendarProperties
} from "./interfaces"
import { Utils } from "./utils";
import { 
    DateRange, 
    MonthNames, 
    WeekDay
} from "./calendarTypes"

export class DatePicker implements IVisual {
    private arrowDown: D3Selection<any, any, any, any>;
    private arrowUp: D3Selection<any, any, any, any>;
    private calendarContainer: D3Selection<any, any, any, any>;
    private calendarIconEndDate: D3Selection<any, any, any, any>;
    private calendarIconStartDate: D3Selection<any, any, any, any>;
    private calendarInputEnabled: boolean = false;
    private calendarInteractive: boolean = false;
    private calendarPeriods: ICalendarDatePeriods;
    private calendarProperties: ICalendarProperties;
    private calendarSvg: Selection<SVGElement>;
    private static categories: powerbiVisualsApi.DataViewCategoryColumn[] | undefined
    //private currentMonth: number = ;
    //private currentYear: number;
    private customDateContainer: D3Selection<any, any, any, any>;
    private dataView: powerbiVisualsApi.DataView;
    private static dateField: powerbiVisualsApi.DataViewMetadataColumn | undefined;
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    //private dateSelected: boolean = false;
    private datesFiltered: boolean = false;
    private static DefaultTextXOffset: number = 5;
    private static DefaultTextYOffset: number = 20;
    //private endDate: Date = Utils.getNormalisedYearEnd(new Date());
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[] = [];
    private monthLabel: D3Selection<any, any, any, any>;
    private options: powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
    private viewport: powerbiVisualsApi.IViewport;
    //private previousEndDate: Date | null = null;
    //private previousStartDate: Date | null = null;
    private selectedDateRange: DateRange = "This Year";
    //private startDate: Date = Utils.getNormalisedYearStart(new Date());
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

    private static CalendarDatePeriods:  ICalendarDatePeriods = {
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear(),
        endDate: Utils.getNormalisedYearEnd(new Date()),
        previousEndDate: null,
        previousStartDate: null,
        startDate: Utils.getNormalisedYearStart(new Date())
    }

    //Power BI sends auto-date hierarchy range 01/01/2020 to 31/12/2030
    //This function requires turning off 'Auto Date/TIme' in Power BI Options
    /*private intialiseStartAndEndDates(categories: powerbiVisualsApi.DataViewCategoryColumn[]): void {

        // Find the column index with the 'Time' role
        const dateColIndex = categories.findIndex(category => category.source.roles && category.source.roles["Time"]);

        let minDate: Date | null = null;
        let maxDate: Date | null = null;
        if (dateColIndex !== -1) {
            const dateValues = categories[dateColIndex]?.values; 
            if (!dateValues) {
                console.log("No date values found");
                return;
            }

            // Extract all date values from the rows for this column
            const dates: Date[] = dateValues
                .filter(d => d != null)
                .map(d => new Date(d as string));
                
            // Example: set min and max for your date picker
            minDate = new Date(Math.min(...dates.map(d => d.getTime())));
            maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
        } else {
            minDate = new Date();
            maxDate = new Date();
        }
        this.calendarPeriods.startDate = Utils.normaliseEndDate(minDate);
        this.calendarPeriods.endDate = Utils.normaliseEndDate(maxDate);
        this.calendarPeriods.previousStartDate = new Date(this.calendarPeriods.startDate);
        this.calendarPeriods.previousEndDate = new Date(this.calendarPeriods.endDate);
        this.startDateInput.min = Utils.formatDate(minDate);
        this.calendarPeriods.endDateInput.max = Utils.formatDate(maxDate);

        // Optional: set default values to the full range 
        this.startDateInput.value = Utils.formatDate(minDate);
        this.calendarPeriods.endDateInput.value = Utils.formatDate(maxDate);
        console.log("initialiseDateInput -minDate: ", minDate, "maxDate", maxDate);
    }*/

    private applyDateRange(range: DateRange) {
        const today: Date = Utils.normaliseStartDate(new Date());

        if (range === "Custom") {
            // Show calendar so user can pick a date 
            this.calendarInputEnabled = true;
            console.log("applyDateRange:\nthis.calendarInputEnabled -", this.calendarInputEnabled);
        } else {

            this.calendarPeriods.previousStartDate = new Date(this.calendarPeriods.startDate);
            this.calendarPeriods.previousEndDate = new Date(this.calendarPeriods.endDate);
            this.calendarInputEnabled = false;
            console.log("applyDateRange:\nthis.calendarInputEnabled -", this.calendarInputEnabled);
            this.updateCalendarVisibility(false); // hide calendar 
        }

        switch (range) {
            case "Today":
                this.calendarPeriods.currentMonth = today.getMonth();
                this.calendarPeriods.currentYear = today.getFullYear();
                this.calendarPeriods.startDate = new Date(today);
                const endofToday = new Date(today);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endofToday);
                break;
            case "Yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                this.calendarPeriods.currentMonth = yesterday.getMonth();
                this.calendarPeriods.currentYear = yesterday.getFullYear();
                this.calendarPeriods.startDate = new Date(yesterday);
                const endofYesterday = new Date(yesterday);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endofYesterday);
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
                this.calendarPeriods.currentMonth = monday.getMonth();
                this.calendarPeriods.currentYear = monday.getFullYear();
                this.calendarPeriods.startDate = new Date(monday);
                this.calendarPeriods.endDate = new Date(sunday);
                break;
            case "This Month":
                this.calendarPeriods.currentMonth = today.getMonth();
                this.calendarPeriods.currentYear = today.getFullYear();
                this.calendarPeriods.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                const endDateThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endDateThisMonth);
                break;
            case "Last Month":
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                this.calendarPeriods.currentMonth = lastMonth.getMonth();
                this.calendarPeriods.currentYear = lastMonth.getFullYear();
                this.calendarPeriods.startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const endDateLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endDateLastMonth);
                break;
            case "This Year":
                this.calendarPeriods.currentMonth = today.getMonth();
                this.calendarPeriods.currentYear = today.getFullYear();
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                this.calendarPeriods.startDate = new Date(startOfYear);
                const endOfYear = new Date(today.getFullYear(), 11, 31);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endOfYear);
                break;
            case "Last Year":
                const lastYear = new Date(today.getFullYear() - 1, 0, 1);
                this.calendarPeriods.currentMonth = lastYear.getMonth();
                this.calendarPeriods.currentYear = lastYear.getFullYear();
                this.calendarPeriods.startDate = new Date(lastYear);
                const endOfLastYear = new Date(lastYear.getFullYear(), 11, 31);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(endOfLastYear);
                break;
            case "Custom":
                break;
            default:
                console.log("Unknown date range selected");
                const _exhaustiveCheck: never = range
                return _exhaustiveCheck;
        }

        this.startDateInput.value = Utils.formatDate(this.calendarPeriods.startDate);
        this.endDateInput.value = Utils.formatDate(this.calendarPeriods.endDate);
        console.log("applyDateRange:\n", "this.startDateInput.value, this.calendarPeriods.startDate -\n",this.startDateInput.value, this.calendarPeriods.startDate, "\nthis.calendarPeriods.endDateInput.value, this.calendarPeriods.endDate) -\n",
        this.endDateInput.value, this.calendarPeriods.endDate);
    }

    private datePeriodChanged() {
        if (!this.calendarPeriods.previousStartDate || !this.calendarPeriods.previousEndDate) return false
        const hasChanged = (this.calendarPeriods.previousStartDate.getTime() !== this.calendarPeriods.startDate.getTime())
            || (this.calendarPeriods.previousEndDate.getTime() !== this.calendarPeriods.endDate.getTime());
        if (hasChanged) { console.log("datePeriodChanged:\nhasChanged -", hasChanged, "\nthis.previousStartDate -", this.calendarPeriods.previousStartDate.getTime(), "this.calendarPeriods.startDate -", this.calendarPeriods.startDate.getTime(), "\nthis.previousEndDate -", this.calendarPeriods.previousEndDate.getTime(), "this.calendarPeriods.endDate -", this.calendarPeriods.endDate.getTime()); }
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
        console.log("applyFilter:\nstartDate, endDate -",startDate, endDate)
        //this.datesFiltered = true;
        //console.log("applyFilter:\nthis.datesFiltered -", this.datesFiltered)
        if (datefield) {
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
                this.getFilterAction(this.calendarPeriods.startDate, this.calendarPeriods.endDate)
            );
        }
    }

    private displayMonth(monthIndex: number): string {
        const monthNames: MonthNames[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return monthNames[monthIndex];
    };

    private renderCalendar() : void{ //options: VisualUpdateOptions): void {
        console.log("renderCalendar:\n this.calendarPeriods.currentMonth, this.calendarPeriods.currentYear:\n ", this.calendarPeriods.currentMonth, this.calendarPeriods.currentYear, "\nthis.startDate, this.calendarPeriods.endDate:\n", this.calendarPeriods.startDate, this.calendarPeriods.endDate)
        this.calendarSvg && this.calendarSvg.selectAll("*").remove();

        let today = new Date(); 
        today = Utils.normaliseStartDate(today);
        let width: number = this.options.viewport.width;
        let height: number = this.calendarInteractive ? 400 : 80;//this.options.viewport.height;
        let props = this.calendarProperties;
        let startX = props.startXpoint + props.leftMargin;
        let startY = props.startYpoint + props.topMargin;

        this.calendarSvg = this.calendarContainer
            .append('svg')
            .classed('calendarSvg', true)
            .attr("width", width)
            .attr("height", height);

        this.monthLabel = this.calendarSvg
            .append("text")
            .classed("monthLabel", true)
            .attr("x", startX + 30)
            .attr("y", startY - props.weekdayLabelHeight - 20)
            .attr("dx", (props.daysInWeek * props.cellWidth) / 2 - props.cellWidth / 2)
            .text(this.displayMonth(this.calendarPeriods.currentMonth) + " " + this.calendarPeriods.currentYear);
        
        let weekdays: WeekDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", ];

        this.calendarSvg.selectAll(".weekdayLabel")
            .data(weekdays)
            .enter()
            .append("text")
            .classed("weekdayLabel", true)
            .text(d => d)
            .attr("x", (d, i) => startX + i * props.cellWidth + props.textXOffset)
            .attr("y", startY - props.weekdayLabelHeight);

        this.arrowUp = this.calendarSvg
            .append("text")
            .classed("arrowUp", true)
            .text("▲")//("↓")
            .attr("x", startX + props.daysInWeek * props.cellWidth - 100) //200
            .attr("y", startY - props.weekdayLabelHeight - 25) //15
            .on("click", () => {
                //this.datesFiltered = true;
                this.calendarPeriods.currentMonth++;
                if (this.calendarPeriods.currentMonth > 11) {
                    this.calendarPeriods.currentMonth = 0;
                    this.calendarPeriods.currentYear++;
                }
                //this.update(this.options); // redraw
                this.renderCalendar();
            });

        this.arrowDown = this.calendarSvg
            .append("text")
            .classed("arrowDown", true)
            .text("▼")//("↓")
            .attr("x", startX + props.daysInWeek * props.cellWidth - 75) //175
            .attr("y", startY - props.weekdayLabelHeight - 25) //15
            .on("click", () => {
                //this.datesFiltered = true;
                this.calendarPeriods.currentMonth--;
                if (this.calendarPeriods.currentMonth < 0) {
                    this.calendarPeriods.currentMonth = 11;
                    this.calendarPeriods.currentYear--;
                }
                //this.update(this.options); // redraw
                this.renderCalendar();
            });

        let totalDays = props.daysInWeek * props.weeksInMonth; // 42 slots
        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth);
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth); // 0=Sun, 1=Mon, ..., 6=Sat

        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
        const daysInPrevMonth = Utils.getNumberofDaysInPrevMonth(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth);

        let daysArray: { day: number, inMonth: boolean, date: Date }[] = [];

        // Fill previous month's trailing days
        for (let i = 0; i < firstDayOfMonth; i++) {
            const date = new Date(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1);
            daysArray.push({
                day: date.getDate(),
                inMonth: false,
                date
            });

        }
        // Fill current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth, d);
            daysArray.push({ day: d, inMonth: true, date });
        }
        // Fill next month leading days until 42 cells
        let nextDay = 1;
        while (daysArray.length < 42) {
            const date = new Date(this.calendarPeriods.currentYear, this.calendarPeriods.currentMonth + 1, nextDay++);
            daysArray.push({ day: date.getDate(), inMonth: false, date });
        }

        this.calendarSvg.selectAll(".dayGroup").remove()

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

        // Background rect
        dayGroups.append("rect")
            .classed("dayCell", true)
            .attr("width", props.cellWidth - props.cellPadding)
            .attr("height", props.cellHeight - props.cellPadding)

        // Circle for 'today'
        dayGroups.filter(d =>
            d.inMonth &&
            today.getFullYear() === this.calendarPeriods.currentYear &&
            today.getMonth() === this.calendarPeriods.currentMonth  &&
            d.day === today.getDate()
        ).append("circle")
            .classed('todayCircle', true)
            .attr("cx", (props.cellWidth - props.cellPadding) / 2)
            .attr("cy", (props.cellHeight - props.cellPadding) / 2)
            .attr("r", Math.min(props.cellWidth, props.cellHeight) / 2 - props.cellPadding)
            .style("fill", "#255A91");

        // Day number text
        dayGroups.append("text")
            .classed("dayNumber", true)
            .attr("x", props.textXOffset)
            .attr("y", props.textYOffset)
            .attr("font-size", "12px")
            .style("fill", d => d.inMonth ? "#255A91" : "#999")
            .style("font-weight", d =>
                d.inMonth &&
                    this.calendarPeriods.currentYear === today.getFullYear() &&
                    this.calendarPeriods.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "bold" : "normal")
            .style("fill", d =>
                d.inMonth &&
                    this.calendarPeriods.currentYear === today.getFullYear() &&
                    this.calendarPeriods.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "white" : d.inMonth ? "#255A91" : "#999")
            .text(d => d.day);

            //console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^",this.calendarSvg);

        dayGroups.on("click", (event, d) => {
            this.calendarPeriods.previousStartDate = new Date(this.calendarPeriods.startDate);
            this.calendarPeriods.previousEndDate = new Date(this.calendarPeriods.endDate);
            if (this.targetInput.id === "startInput") {
                this.startDateInput.value = Utils.formatDate(d.date);
                this.calendarPeriods.startDate = Utils.normaliseStartDate(d.date);
                //this.targetInput = this.calendarPeriods.endDateInput;
                this.updateCalendarVisibility(false);
                //return;
            }

            if (this.targetInput.id === "endInput") {
                this.endDateInput.value = Utils.formatDate(d.date);
                this.calendarPeriods.endDate = Utils.normaliseEndDate(d.date)                
                //this.targetInput = null;
                this.updateCalendarVisibility(false); // hide calendar after selection
            }
            //this.dateSelected = true;
            console.log("update: daysGroup.on click:\nthis.dateSelected, this.datesFiltered:", /*this.dateSelected, */this.datesFiltered);

            if (DatePicker.dateField) {
                //this.datesFiltered = true;
                this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
            }
            
            //this.update(options);
        });

        console.log("renderCalender:\nthis.currentMonth, this.calendarPeriods.currentYear", this.calendarPeriods.currentMonth, this.calendarPeriods.currentYear);
    }


    //better 
    
    private refreshCalendar(heightUpdate?: number) {
        if (!this.dataView) return; 
         
    console.log("refreshCalendar:\nthis.calendarInteractive - ", this.calendarInteractive)
    // Use the passed height or default to 80 
    const height = heightUpdate || 80;
    // Update the viewport for layout calculations 
    this.viewport = { 
        width: this.rootSelection.node()?.clientWidth || 400, 
        height: height, 
        //scale: 1 // optional, keep scale 1 unless you need zoom 
    }; 
    
    console.log("refreshCalendar: this.viewport:", this.viewport); 
  
    // Trigger Power BI update 
    this.update({ 
        type: powerbiVisualsApi.VisualUpdateType.Data | powerbiVisualsApi.VisualUpdateType.Resize, 
        viewport: this.viewport, 
        viewMode: undefined, 
        dataViews: [this.dataView], // pass the actual data 
        jsonFilters: this.jsonFilters 
    }); 

} /*
        if (!this.dataView) return;
        this.update(this.options) { 
            const availableHeight = this.calendarInteractive ? 400 : 80;  // new height 
            this.calendarSvg 
                .attr("height", availableHeight) 
                .attr("width", this.options.viewport.width); 
            this.viewport = { 
                width: this.options.viewport.width, 
                height: availableHeight 
            }; 
        }
        
        this.viewport = this.calendarInteractive ? { 
            width: 397.77777777777777, 
            height: 394.44444444444446
        } : { 
            width: 397.77777777777777, 
            height: 77.77777777777777
        } 
        console.log("refreshCalendar:\n this.viewport:\n", this.viewport)

        this.update({
            type: powerbiVisualsApi.VisualUpdateType.Data | powerbiVisualsApi.VisualUpdateType.Resize,
            viewport: this.viewport,
            viewMode: undefined,
            dataViews: [this.dataView], // pass the actual data 
            jsonFilters: this.jsonFilters
        });
    }*/

    private updateCalendarVisibility(isVisible: boolean) {
        this.calendarInteractive = isVisible;
        console.log("updateCalendarVisibility:\nthis.calendarInteractive -", this.calendarInteractive)
        this.calendarContainer.style("display", this.calendarInteractive ? "block" : "none");
    }

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
            .property("selected", d => this.selectedDateRange && d === this.selectedDateRange);                  
        this.dateRangeDropDown
            .on("change", (event: any) => {
                const selectElement = event.target as HTMLSelectElement;
                const value = selectElement.value as DateRange;
                this.selectedDateRange = value;
                this.customDateContainer
                    .style("pointer-events", value === "Custom" ? "auto" : "none")
                    .style("opacity", value === "Custom" ? 1 : 0.5)
                console.log("dateRangeDropDown\non change:\nvalue -", value);
                this.applyDateRange(value);
                if (value !== "Custom" && DatePicker.dateField) {
                    //this.datesFiltered = true;
                    this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
                }                
                //this.dateSelected = true;
                //(value !== "Custom") && this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
                //this.datesFiltered = false;
                //(value !== "Custom") && this.update(this.options);
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
            
        // Calendar icon (using Unicode or SVG) 
        this.calendarIconStartDate = this.startDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG           
            .on("click", () => {
                if (!this.dataView) return;
                if (this.calendarInputEnabled === true) {
                    console.log("constructor - calendarIconStartDate:\nthis.calendarInputEnabled -", this.calendarInputEnabled)
                    this.targetInput = this.startDateInput;
                    this.updateCalendarVisibility(true);
                    const heightUpdate = this.calendarInteractive ? 400 : 80;
                    this.rootSelection.style("height", `${heightUpdate}px`) // show calendar 

                    const today = new Date(); 
                    this.calendarPeriods.currentMonth = this.calendarPeriods.startDate 
                        ? this.calendarPeriods.startDate.getMonth() 
                        : today.getMonth(); 
                    this.calendarPeriods.currentYear = this.calendarPeriods.startDate 
                        ? this.calendarPeriods.startDate.getFullYear() 
                        : today.getFullYear(); 
                    this.renderCalendar();
                    this.refreshCalendar(heightUpdate);
                }
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
        this.calendarIconEndDate = this.endDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    console.log("constructor - calendarIconEndDate:\nthis.calendarInputEnabled -", this.calendarInputEnabled)
                    this.targetInput = this.endDateInput;
                    //this.datesFiltered = true;
                    this.updateCalendarVisibility(true); // show calendar
                    //this.calendarPeriods.currentMonth = this.calendarPeriods.endDate.getMonth();
                    //this.calendarPeriods.currentYear = this.calendarPeriods.endDate.getFullYear();  
                    //if (this.options) this.update(this.options);
                    if (this.calendarPeriods.startDate) { 
                        this.calendarPeriods.currentMonth = this.calendarPeriods.startDate.getMonth(); 
                        this.calendarPeriods.currentYear = this.calendarPeriods.startDate.getFullYear(); 
                    } else { 
                        const today = new Date(); 
                        this.calendarPeriods.currentMonth = today.getMonth(); 
                        this.calendarPeriods.currentYear = today.getFullYear(); 
                    } 
                    this.renderCalendar();
                }
            });

        this.calendarContainer = this.rootSelection
            .append("div")
            .classed("calendarContainer", true);
    
        this.calendarPeriods = { ...this.calendarPeriods } as ICalendarDatePeriods
        //this.calendarPeriods.endDate = Utils.getNormalisedYearEnd(new Date);
        //this.calendarPeriods.previousStartDate = new Date(this.calendarPeriods.startDate);
        //this.calendarPeriods.previousEndDate = new Date(this.calendarPeriods.endDate);
        //this.calendarPeriods.startDate = Utils.getNormalisedYearStart(new Date);
        //this.calendarProperties = { ...DatePicker.CalendarMargins } as ICalendarProperties; 
        this.calendarProperties = {
            topMargin: DatePicker.CalendarMargins.TopMargin,
            bottomMargin: DatePicker.CalendarMargins.BottomMargin,
            leftMargin: DatePicker.CalendarMargins.LeftMargin,
            rightMargin: DatePicker.CalendarMargins.RightMargin,
            // cell dimensions (each day box) 
            cellWidth: DatePicker.CalendarMargins.CellWidth,    // width of a single day cell 
            cellHeight: DatePicker.CalendarMargins.CellHeight,  // height of a single day cell 
            cellPadding: DatePicker.CalendarMargins.CellPadding, // inner spacing 
            // grid layout (rows = weeks, cols = days) 
            daysInWeek: 7,
            weeksInMonth: 6, // typical calendar grid 
            startXpoint: DatePicker.CalendarMargins.StartXpoint,
            startYpoint: DatePicker.CalendarMargins.StartYpoint,
            // header/legend 
            headerHeight: DatePicker.CalendarMargins.HeaderHeight, // month name or day labels 
            weekdayLabelHeight: DatePicker.CalendarMargins.WeekdayLabelHeight,

            // text positioning 
            textXOffset: DatePicker.DefaultTextXOffset,
            textYOffset: DatePicker.DefaultTextYOffset,
        };
    }

    public update(options: VisualUpdateOptions) {
        if (!options) {
            console.log("Options is not available", options);
            return;
        }
        
        this.options = options;
        console.log("update:\n boxes:\n", options);
        this.viewport = options.viewport;
        console.log("update - this.viewport:\n", options.viewport)

        this.dataView = options.dataViews && options.dataViews[0];

        if (!options.dataViews || options.dataViews.length === 0) {
            console.log("No dateViews");
            return;
        }

        const dataView: DataView = options.dataViews[0];

        const range = dataView?.metadata?.objects?.sharedState?.rangeText; 
        console.log("-------------- range - ", range);

        DatePicker.dateField = dataView.metadata.columns.find(col => col.roles && col.roles["Time"]);
        if (!DatePicker.dateField) {
            console.log("No dateField found");
            return;
        }

        if (!dataView.categorical) {
            console.log("No categorical data found");
            return;
        }

        DatePicker.categories = dataView.categorical.categories as powerbiVisualsApi.DataViewCategoryColumn[];

        if (!DatePicker.categories || DatePicker.categories.length === 0) {
            console.log("No categories found");
            return;
        }

        /*if (!this.dateSelected) {
            console.log("update:\nthis.dateSelected, this.selectedDateRange:\n",  this.dateSelected, , this.selectedDateRange)
            this.applyDateRange(this.selectedDateRange);            
            //this.dateSelected = true;
            //this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
            //this.datesFiltered = true;
        }*/

        //console.log("update:\nthis.dateSelected -",  /*this.dateSelected, */)

        /*if (!this.datesFiltered && this.datePeriodChanged()) {
            this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
            this.datesFiltered = true;
        }*/
        //console.log("Filtering complete")
        //this.datesFiltered = false;
        //console.log("update:\nthis.datesFiltered -", this.datesFiltered)
        
        /*if (!this.calendarInteractive) {
            console.log("update:\nthis.calendarInteractive -", this.calendarInteractive);
            return
        }*/

        

        
        console.log("******* End of update *******");
    }
    

}