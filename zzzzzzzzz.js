//"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import powerbiVisualsApi from "powerbi-visuals-api";
import { AdvancedFilter, IFilterColumnTarget } from "powerbi-models";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IFilter = powerbi.IFilter;

import * as d3 from "d3";
import { select as d3Select, selectAll as d3SelectAll, Selection as D3Selection, } from "d3-selection";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
import {
    ICalendarProperties,
    ICalendarMargins
} from "./interfaces"
import { Utils } from "./utils";

export class Calendar implements IVisual {
    private calendarContainer: D3Selection<any, any, any, any>;
    private calendarIconEndDate: D3Selection<any, any, any, any>;
    private calendarIconStartDate: D3Selection<any, any, any, any>;
    private calendarInputEnabled: boolean = false; // initially not interactive
    private calendarInteractive: boolean = false; // initially not interactive
    private calendarProperties: ICalendarProperties
    private calendarSvg: Selection<SVGElement>;
    private container: Selection<SVGElement>;
    private currentMonth: number;
    private currentYear: number;
    private customDateContainer: D3Selection<any, any, any, any>;
    private static dateField: powerbi.DataViewMetadataColumn | undefined;
    //private dateFilter: AdvancedFilter;
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    private dateRangeSelected: string = "This Year";
    private dateSelected: boolean = false;
    private defaultDatesApplied: boolean = false;
    private static DefaultTextXOffset: number = 5;
    private static DefaultTextYOffset: number = 20;
    private endDate: Date = Utils.normaliseEndDate(new Date());
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private highlightEnd: Date | null = null;
    private highlightStart: Date | null = null;
    private host: IVisualHost;
    private jsonFilter: AdvancedFilter
    private jsonFilters: powerbiVisualsApi.IFilter[] = [];
    private rect: d3.Selection<SVGRectElement, any, any, any>;
    private startDate: Date = Utils.normaliseStartDate(new Date(2025, 0, 1));
    private startDateInput: HTMLInputElement;
    private startDateInputContainer: D3Selection<any, any, any, any>;
    private rootSelection: D3Selection<any, any, any, any>;
    private targetInput: HTMLInputElement | null = null;
    private today: Date = Utils.normaliseStartDate(new Date());
    private textLabel: Selection<SVGElement>;

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

    private applyDateRange(range: string) {
        this.dateSelected = true;
        console.log("Applying date range:", range);
        this.dateRangeSelected = range;
        console.log("applyDateRange - this.dateSelected", this.dateSelected, "this.dateRangeSelected", this.dateRangeSelected);
        if (range === "Custom") {
            this.calendarInputEnabled = true;
        } else {
            this.calendarInputEnabled = false;
            this.updateCalendarVisibility(false); // hide calendar 
        }
        switch (range) {
            case "Today":
                this.currentMonth = this.today.getMonth();
                this.currentYear = this.today.getFullYear();
                this.startDate = new Date(this.today)
                break;
            case "Yesterday":
                const yesterday = new Date(this.today);
                yesterday.setDate(this.today.getDate() - 1);
                this.currentMonth = yesterday.getMonth();
                this.currentYear = yesterday.getFullYear();
                this.startDate = yesterday;
                this.endDate = this.startDate;/
                break;
            case "This Week":
            case "Last Week":
                // For week ranges, just jump to the month containing Monday of that week
                const dayOfWeek = this.today.getDay(); // 0=Sun, 1=Mon,...6=Sat 
                // Offset so Monday is always the first day 
                const weekStartOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                const monday = new Date(this.today);
                monday.setDate(this.today.getDate() - weekStartOffset);
                if (range === "Last Week") {
                    monday.setDate(monday.getDate() - 7);
                }
                const sunday = Utils.normaliseEndDate(new Date(monday));
                sunday.setDate(monday.getDate() + 6);
                this.currentMonth = monday.getMonth();
                this.currentYear = monday.getFullYear();
                this.startDate = monday;
                this.endDate = sunday;/
                break;
            case "This Month":
                this.currentMonth = this.today.getMonth();
                this.currentYear = this.today.getFullYear();
                this.startDate = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
                const endDateThisMonth = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 0);
                this.endDate = Utils.normaliseEndDate(endDateThisMonth);
                break;
            case "Last Month":
                const lastMonth = new Date(this.today.getFullYear(), this.today.getMonth() - 1, 1);
                this.currentMonth = lastMonth.getMonth();
                this.currentYear = lastMonth.getFullYear();
                this.startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const endDateLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                this.endDate = Utils.normaliseEndDate(endDateLastMonth);
                break;
            case "This Year":
                this.currentMonth = this.today.getMonth();
                this.currentYear = this.today.getFullYear();
                const startOfYear = new Date(this.today.getFullYear(), 0, 1);
                this.startDate = Utils.normaliseStartDate(startOfYear);
                const endOfYear = new Date(this.today.getFullYear(), 11, 31);
                this.endDate = Utils.normaliseEndDate(endOfYear);
                break;
            case "Last Year":
                const lastYear = new Date(this.today.getFullYear() - 1, 0, 1);
                this.currentMonth = lastYear.getMonth();
                this.currentYear = lastYear.getFullYear();
                this.startDate = lastYear;
                this.endDate = new Date(lastYear.getFullYear(), 11, 31);
                const endOfLastYear = new Date(lastYear.getFullYear(), 11, 31);
                this.endDate = Utils.normaliseEndDate(endOfLastYear);/
                break;
            case "Custom":
                break;
            default:
                console.log("Unknown date range selected");
        }
        // Force calendar redraw 
        console.log("this.startDate", this.startDate, "this.endDate", this.endDate);

        this.startDateInput.value = Utils.formatDate(this.startDate);
        this.endDateInput.value = Utils.formatDate(this.endDate);
        this.highlightStart = new Date(this.startDate);
        this.highlightEnd = new Date(this.endDate);

    }

    private applyFilter(datefield: any, startDate: Date, endDate: Date) {

        console.log("Applying filter from", startDate, "to", endDate);
        console.log("Calendar.dateField", datefield);
        if (datefield) {
            console.log("Applying filter to", datefield.displayName, "with queryName", datefield.queryName);
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

            //this.jsonFilters = [filter];
            this.host.applyJsonFilter(
                filter,
                "general",
                "filter",
                powerbi.FilterAction.merge
            );
        }
    }

    private updateCalendarVisibility(isVisible: boolean) {
        this.calendarInteractive = isVisible;
        this.calendarSvg.style("display", this.calendarInteractive ? "block" : "none");
    }

    //Look private static TimelineSelectors: ITimelineSelectors

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
            .text("Range: Day, Week, Month, Year");
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
            .property("selected", d => d === this.dateRangeSelected);               
        this.dateRangeDropDown
            .on("change", (event: any) => {
                const selectElement = event.target as HTMLSelectElement;
                const value = selectElement.value;
                this.dateRangeSelected = value;
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
        this.startDateInput.value = Utils.formatDate(this.today);
        // Calendar icon (using Unicode or SVG) 
        this.calendarIconStartDate = this.startDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.startDateInput;
                    this.updateCalendarVisibility(true); // show calendar 
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
        this.endDateInput.value = Utils.formatDate(this.today);
        this.calendarIconEndDate = this.endDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    this.targetInput = this.endDateInput;
                    this.updateCalendarVisibility(true); // show calendar 
                }
            });
        this.calendarSvg = this.rootSelection
            .append('svg')
            .classed('calendarSvg', true)
        this.calendarContainer = this.calendarSvg
            .append("g")
            .classed('calendarContainer', true);
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
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
        let today = new Date();
        today = Utils.normaliseStartDate(today);
        if (!this.dateSelected) {
            console.log("No date selected")
            this.applyDateRange(this.dateRangeSelected);
        }
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
        this.applyFilter(Calendar.dateField, this.startDate, this.endDate);


        if (!dataView.categorical) {
            console.log("No categorical data found");
            return;
        }

        const categories = dataView.categorical.categories
        if (!categories || categories.length === 0) {
            console.log("No categories found");
            return;
        }
        const dateValues = categories[0]?.values;
        console.log("dateValues", dateValues.length, "1: ", + dateValues[0], "2: " + dateValues[1], "3: " + dateValues[dateValues.length - 1]);
        console.log("End of update");
    }


}
