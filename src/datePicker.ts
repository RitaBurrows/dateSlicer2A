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
import DataViewPropertyValue = powerbiVisualsApi.DataViewPropertyValue;
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
import { CartesianChartType } from "powerbi-visuals-utils-chartutils/lib/label/labelUtils";

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
    private static dateString: DataViewPropertyValue | undefined
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
    private filterApplied: boolean = false;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[] = [];
    private monthLabel: D3Selection<any, any, any, any>;
    private options: powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
    //private viewport: powerbiVisualsApi.IViewport;
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

    private applyDateRange(range: DateRange) {
        const today: Date = Utils.normaliseStartDate(new Date());

        if (range === "Custom") {
            // Show calendar so user can pick a date 
            this.calendarInputEnabled = true;
            console.log("applyDateRange:\nthis.calendarInputEnabled -", this.calendarInputEnabled);
        } else {

            console.log("applyDateRange: else")
            //this.calendarPeriods.previousStartDate = new Date(this.calendarPeriods.startDate);
            this.calendarPeriods.previousEndDate = new Date(this.calendarPeriods.endDate);
            this.calendarInputEnabled = false;
            console.log("applyDateRange:\nthis.calendarInputEnabled -", this.calendarInputEnabled);
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
        
        //this.startDateInput.value = Utils.formatDate(this.calendarPeriods.startDate, "inputBox");
        //this.endDateInput.value = Utils.formatDate(this.calendarPeriods.endDate, "inputBox");
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
        try{console.log("applyFilter:\nstartDate, endDate -",startDate, endDate);
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
    }catch(e){console.log(e)}
    }

    
    private splitDateString(dateStr: any){
        const dates = dateStr.split(" to ")
        this.calendarPeriods.startDate = new Date(dates[0])
        this.calendarPeriods.endDate = Utils.normaliseEndDate(new Date(dates[1]))
    }

    private createDateString(startDate: Date, endDate: Date){
        return `${Utils.formatDate(startDate, "sharedState")} to ${Utils.formatDate(endDate, "sharedState")}`;
    }

    
    private updateSharedState(startDate: Date,endDate: Date){
        const sharedState = this.createDateString(startDate, endDate);
        this.host.persistProperties({ 
            merge: [{ 
                objectName: "sharedState", 
                selector: null, 
                properties: { rangeText: sharedState } 

            }] 
        });
    }

    constructor(options: VisualConstructorOptions) {
        this.calendarPeriods = { ...DatePicker.CalendarDatePeriods } as ICalendarDatePeriods
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
                    this.updateSharedState(this.calendarPeriods.startDate, this.calendarPeriods.endDate);
                    this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
                }                
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
        const inputBoxStartDate = Utils.formatDate(this.calendarPeriods.startDate, "inputBox");
    this.startDateInput = this.startDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "startInput")
            .property("value", inputBoxStartDate)
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
                    const heightUpdate = this.calendarInteractive ? 400 : 80;
                    this.rootSelection.style("height", `${heightUpdate}px`) // show calendar 

                    const today = new Date(); 
                    this.calendarPeriods.currentMonth = this.calendarPeriods.startDate 
                        ? this.calendarPeriods.startDate.getMonth() 
                        : today.getMonth(); 
                    this.calendarPeriods.currentYear = this.calendarPeriods.startDate 
                        ? this.calendarPeriods.startDate.getFullYear() 
                        : today.getFullYear(); 
                }
            });
        this.endDateInputContainer = this.dateInputContainer
            .append("div")
            .classed("endDateInputContainer", true)
        // Initialize with today's date 
        
        const inputBoxEndDate = Utils.formatDate(this.calendarPeriods.endDate, "inputBox");
        this.endDateInput = this.endDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "endInput")
            .property("value", inputBoxEndDate)
            .node() as HTMLInputElement;
        this.calendarIconEndDate = this.endDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  // simple emoji, can replace with SVG 
            .on("click", () => {
                if (this.calendarInputEnabled === true) {
                    console.log("constructor - calendarIconEndDate:\nthis.calendarInputEnabled -", this.calendarInputEnabled)
                    this.targetInput = this.endDateInput;
                    if (this.calendarPeriods.startDate) { 
                        this.calendarPeriods.currentMonth = this.calendarPeriods.startDate.getMonth(); 
                        this.calendarPeriods.currentYear = this.calendarPeriods.startDate.getFullYear(); 
                    } else { 
                        const today = new Date(); 
                        this.calendarPeriods.currentMonth = today.getMonth(); 
                        this.calendarPeriods.currentYear = today.getFullYear(); 
                    } 
                }
            });            
    }

    public update(options: VisualUpdateOptions) {
        try{
        if (!options) {
            console.log("Options is not available", options);
            return;
        }
        
        this.options = options;
        console.log("update:\nDatePicker:\n", options);
        //this.viewport = options.viewport;
        //console.log("update - this.viewport:\n", options.viewport)

        this.dataView = options.dataViews && options.dataViews[0];

        if (!options.dataViews || options.dataViews.length === 0) {
            console.log("No dateViews");
            return;
        }

        const dataView: DataView = options.dataViews[0];
             
        //console.log("update:\n, DatePicker.dateString", range1)

       //const range = dataView?.metadata?.objects?.sharedState?.rangeText; 
        //console.log("-------------- range - ", range);
        
        //compare dataViewPropertyValue and range
        //const dataViewPropertyValue: DataViewPropertyValue = dataView.metadata.objects;

        DatePicker.dateField = dataView.metadata.columns.find(col => col.roles && col.roles["Time"]);
        if (!DatePicker.dateField) {
            console.log("No dateField found");
            return;
        }

        if (!dataView.categorical) {
            console.log("No categorical data found");
            return;
        }

        if (!dataView.categorical.categories || dataView.categorical.categories.length === 0) {
            console.log("No categories found");
            return;
        }
        
        if(!this.filterApplied && options.jsonFilters.length == 0){
            this.applyFilter(DatePicker.dateField, this.calendarPeriods.startDate, this.calendarPeriods.endDate);
            this.filterApplied = true;
        }
        
        const rangetext = dataView.metadata?.objects?.sharedState?.rangeText;
        DatePicker.dateString = rangetext && rangetext ||  this.createDateString(this.calendarPeriods.startDate, this.calendarPeriods.endDate);
        console.log("update - DatePicker.dateString - ", DatePicker.dateString);
        } 
        catch(err){
            console.log(err)
        }
        /* const range1 = (dataViewPropertyValue && typeof dataViewPropertyValue === "object" && "sharedState" in dataViewPropertyValue)
            ? (dataViewPropertyValue as any).sharedState.rangeText
            : undefined;
            */
        /*
        if (!dataView.categorical) {
            console.log("No categorical data found");
            return;
        }

        DatePicker.categories = dataView.categorical.categories as powerbiVisualsApi.DataViewCategoryColumn[];

        if (!DatePicker.categories || DatePicker.categories.length === 0) {
            console.log("No categories found");
            return;
        } 
            */          
        console.log("******* End of update *******");
    }
    

}