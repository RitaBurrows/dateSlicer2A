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
    ICalendarProperties,
    ICalendarMargins
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
    private calendarProperties: ICalendarProperties
    private calendarSvg: Selection<SVGElement>;
    private static categories: powerbiVisualsApi.DataViewCategoryColumn[] | undefined
    private currentMonth: number;
    private currentYear: number;
    private customDateContainer: D3Selection<any, any, any, any>;
    private dataView: powerbiVisualsApi.DataView;
    private static dateField: powerbiVisualsApi.DataViewMetadataColumn | undefined;
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    private dateSelected: boolean = false;
    private datesFiltered: boolean = true;
    private static DefaultTextXOffset: number = 5;
    private static DefaultTextYOffset: number = 20;
    private endDate: Date;
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[] = [];
    private monthLabel: D3Selection<any, any, any, any>;
    private options: powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
    private previousStartDate: Date;
    private previousEndDate: Date;
    private selectedDateRange: DateRange = "This Year";
    private startDate: Date;
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
    //This function requires turning off 'Auto Date/TIme' in Power BI Options
    private intialiseStartAndEndDates(categories: powerbiVisualsApi.DataViewCategoryColumn[]): void {

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

    private applyDateRange(range: DateRange) {
        const today: Date = Utils.normaliseStartDate(new Date());
        this.dateSelected = true;

        if (range === "Custom") {
            // Show calendar so user can pick a date 
            this.calendarInputEnabled = true;
        } else {

            this.previousStartDate = new Date(this.startDate);
            this.previousEndDate = new Date(this.endDate);
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
                const _exhaustiveCheck: never = range
                return _exhaustiveCheck;
        }

        this.startDateInput.value = Utils.formatDate(this.startDate);
        this.endDateInput.value = Utils.formatDate(this.endDate);
    }

    private datePeriodChanged() {
        if (!this.previousStartDate || !this.previousEndDate) return false
        const hasChanged = (this.previousStartDate.getTime() !== this.startDate.getTime())
            || (this.previousEndDate.getTime() !== this.endDate.getTime());
        if (hasChanged) { console.log("datePeriodChanged:\nhasChanged -", hasChanged, "\nthis.previousStartDate -", this.previousStartDate.getTime(), "this.startDate -", this.startDate.getTime(), "\nthis.previousEndDate -", this.previousEndDate.getTime(), "this.endDate -", this.endDate.getTime()); }
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
        this.datesFiltered = true;
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
                this.getFilterAction(this.startDate, this.endDate)
            );
        }
    }

    private displayMonth(monthIndex: number): string {
        const monthNames: MonthNames[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return monthNames[monthIndex];
    };

    private drawCalendar(options: VisualUpdateOptions): void {

        if (!this.calendarInteractive) return;
        if (!this.calendarSvg || !options) {
            console.log("Either calender svg or options is not available", this.calendarSvg, "options", options);
            return;
        }

        let today = new Date();
        today = Utils.normaliseStartDate(today);
        let width: number = options.viewport.width;
        let height: number = options.viewport.height;
        let props = this.calendarProperties;
        let startX = props.startXpoint + props.leftMargin;
        let startY = props.startYpoint + props.topMargin;

        this.calendarContainer = this.rootSelection
            .append("div")
            .classed("calendarContainer", true);

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
            .text(this.displayMonth(this.currentMonth) + " " + this.currentYear);
        
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
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.drawCalendar(this.options); // redraw
            });

        this.arrowDown = this.calendarSvg
            .append("text")
            .classed("arrowDown", true)
            .text("▼")//("↓")
            .attr("x", startX + props.daysInWeek * props.cellWidth - 75) //175
            .attr("y", startY - props.weekdayLabelHeight - 25) //15
            .on("click", () => {
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.drawCalendar(this.options); // redraw
            });

        let totalDays = props.daysInWeek * props.weeksInMonth; // 42 slots
        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.currentYear, this.currentMonth);
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.currentYear, this.currentMonth); // 0=Sun, 1=Mon, ..., 6=Sat

        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
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
            today.getFullYear() === this.currentYear &&
            today.getMonth() === this.currentMonth  &&
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
            this.previousStartDate = new Date(this.startDate);
            this.previousEndDate = new Date(this.endDate);
            if (this.targetInput.id === "startInput") {
                this.startDateInput.value = Utils.formatDate(d.date);
                this.startDate = Utils.normaliseStartDate(d.date);
            }

            if (this.targetInput.id === "endInput") {
                this.endDateInput.value = Utils.formatDate(d.date);
                this.endDate = Utils.normaliseEndDate(d.date)
            }
            this.updateCalendarVisibility(false); // hide calendar after selection
            this.targetInput = null;
            this.update(options);
        });
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
        console.log("updateCalendarVisibility:\nisVisible", isVisible)
        this.calendarInteractive = isVisible;
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

                this.applyDateRange(value);
                (value !== "Custom") && this.applyFilter(DatePicker.dateField, this.startDate, this.endDate);
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
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.startDateInput;
                    this.updateCalendarVisibility(true); // show calendar  
                    if (this.options) this.drawCalendar(this.options);
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
                    this.targetInput = this.endDateInput;
                    this.updateCalendarVisibility(true); // show calendar 
                    if (this.options) this.drawCalendar(this.options);
                }
            });

    
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.endDate = Utils.getNormalisedYearEnd(new Date);
        this.previousStartDate = new Date(this.startDate);
        this.previousEndDate = new Date(this.endDate);
        this.startDate = Utils.getNormalisedYearStart(new Date);
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
        this.options = options;
        this.dataView = options.dataViews && options.dataViews[0];
        if (!options.dataViews || options.dataViews.length === 0) {
            console.log("No dateViews");
            return;
        }
        const dataView: DataView = options.dataViews[0];

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

        if (!this.dateSelected) {
            !this.dateSelected && console.log("No date selected:\nthis.dateSelected, this.selectedDateRange -", this.dateSelected, this.selectedDateRange)
            this.applyDateRange(this.selectedDateRange);
            this.applyFilter(DatePicker.dateField, this.startDate, this.endDate);
        }

        if (!this.datesFiltered && this.datePeriodChanged()) {
            this.applyFilter(DatePicker.dateField, this.startDate, this.endDate);
        }
        this.datesFiltered = false;
        

        console.log("End of update *********************************");
    }

}