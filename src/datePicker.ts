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
import { Utils } from "./utils";
import { DateRange } from "./calendarTypes"

export class DatePicker implements IVisual {
    private calendarIconEndDate: D3Selection<any, any, any, any>;
    private calendarIconStartDate: D3Selection<any, any, any, any>;
    private calendarInputEnabled: boolean = false;
    private customDateContainer: D3Selection<any, any, any, any>;
    private dataView: powerbiVisualsApi.DataView;
    private static dateField: powerbiVisualsApi.DataViewMetadataColumn | null;
    private dateString: DataViewPropertyValue | null
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    private endDate: Date = Utils.normaliseEndDate(new Date());
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private filterApplied: boolean = false;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[] = [];
    private options: powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
    private previousDateString: DataViewPropertyValue | null = null;
    private selectedDateRange: DateRange = "This Year";
    private startDate: Date = Utils.getNormalisedYearStart(new Date());
    private startDateInput: HTMLInputElement;
    private startDateInputContainer: D3Selection<any, any, any, any>;
    private rootSelection: D3Selection<any, any, any, any>;

    private applyDateRange(range: DateRange) {
        const today: Date = Utils.normaliseStartDate(new Date());
        this.previousDateString = this.dateString;

        switch (range) {
            case "Today":
                this.startDate = new Date(today);
                this.endDate = Utils.normaliseEndDate(today);
                break;
            case "Yesterday":
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                this.startDate = new Date(yesterday);
                const endofYesterday = new Date(yesterday);
                this.endDate = Utils.normaliseEndDate(endofYesterday);
                break;
            case "This Week":
            case "Last Week":
                const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon,...6=Sat 
                const weekStartOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
                const monday = new Date(today);
                monday.setDate(today.getDate() - weekStartOffset);
                if (range === "Last Week") {
                    monday.setDate(monday.getDate() - 7);
                }
                const sunday = Utils.normaliseEndDate(new Date(monday));
                sunday.setDate(monday.getDate() + 6);
                this.startDate = new Date(monday);
                this.endDate = (range === "Last Week") ? new Date(sunday) : new Date(Utils.normaliseEndDate(today));
                break;
            case "This Month":
                this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                this.endDate = Utils.normaliseEndDate(today);
                break;
            case "Last Month":
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                this.startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
                const endDateLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
                this.endDate = Utils.normaliseEndDate(endDateLastMonth);
                break;
            case "This Year":
                const startOfYear = new Date(today.getFullYear(), 0, 1);
                this.startDate = new Date(startOfYear);
                this.endDate = Utils.normaliseEndDate(today);
                break;
            case "Last Year":
                const lastYear = new Date(today.getFullYear() - 1, 0, 1);
                this.startDate = new Date(lastYear);
                const endOfLastYear = new Date(lastYear.getFullYear(), 11, 31);
                this.endDate = Utils.normaliseEndDate(endOfLastYear);
                break;
            case "Custom":
                this.calendarInputEnabled = true;
                break;
            default:
                console.log("DatePicker - applyDateRange: Unknown date range selected");
                const _exhaustiveCheck: never = range
                return _exhaustiveCheck;
        }

        this.startDateInput.value = Utils.formatDate(this.startDate, "inputBox");
        this.endDateInput.value = Utils.formatDate(this.endDate, "inputBox");
        console.log("DatePicker - applyDateRange:\nthis.startDate, this.endDate:", this.startDate, this.endDate, "\nthis.startDateInput.value, this.endDateInput.value:",  this.startDateInput.value, this.endDateInput.value, "\nthis.previousDateString:", this.previousDateString);
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
            console.log("DatePicker - applyFilter - startDate, endDate:", startDate, endDate);
            if (datefield) {
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


    private splitAndApplyDateString(dateStr: any) {
        const dates = dateStr.split(" to ")
        this.startDate = new Date(dates[0])
        this.endDate = Utils.normaliseEndDate(new Date(dates[1]))
        this.startDateInput.value = Utils.formatDate(this.startDate, "inputBox");
        this.endDateInput.value = Utils.formatDate(this.endDate, "inputBox");
        console.log("DatePicker - splitAndApplyDateString - this.startDate, this.endDate:", this.startDate, this.endDate)
    }

    private updateSharedState(startDate: Date, endDate: Date) {
        const sharedState = Utils.createDateString(startDate, endDate);
        this.host.persistProperties({
            merge: [{
                objectName: "sharedDateRange",
                selector: null,
                properties: { dateString: sharedState }

            }]
        });
        this.dateString = sharedState;
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
            .text("Day, Week, Month, Year, All");
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
                this.updateSharedState(this.startDate, this.endDate);
                console.log("DatePicker - constructor - this.dateRangeDropDown - onChange - this.dateString:", this.dateString);
                if (value !== "Custom" && DatePicker.dateField) {
                    this.calendarInputEnabled = false;
                    this.applyFilter(DatePicker.dateField, this.startDate, this.endDate);
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
        const inputBoxStartDate = Utils.formatDate(this.startDate, "inputBox");
        this.startDateInput = this.startDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "startInput")
            .property("value", Utils.formatDate(this.startDate, "inputBox"))
            .node() as HTMLInputElement;

        this.calendarIconStartDate = this.startDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  

        this.endDateInputContainer = this.dateInputContainer
            .append("div")
            .classed("endDateInputContainer", true)

        const inputBoxEndDate = Utils.formatDate(this.endDate, "inputBox");
        this.endDateInput = this.endDateInputContainer
            .append("input")
            .attr("type", "text")
            .attr("id", "endInput")
            .property("value", inputBoxEndDate)
            .node() as HTMLInputElement;
        this.calendarIconEndDate = this.endDateInputContainer
            .append("span")
            .classed("calendarIcon", true)
            .html("📅")  
    }

    public update(options: VisualUpdateOptions) {
        try {
            console.log("DatePicker update - options:", options);
            if (!options) {
                console.log("DatePicker update: No options available");
                return;
            }

            if (!options.dataViews || options.dataViews.length === 0) {
                console.log("DatePicker update: No dateViews found");
                return;
            }
            
            this.dataView = options.dataViews && options.dataViews[0];
        
            if (!DatePicker.dateField) {
                DatePicker.dateField =  this.dataView.metadata.columns.find(col => col.roles && col.roles["Time"]);
                if (!DatePicker.dateField) {
                    console.log("DatePicker update: No dateField found");
                    return;
                }
            }
           
            if (!this.filterApplied) {
                console.log("DatePicker update - !this.filterApplied (filter not applied:", !this.filterApplied);
                this.applyFilter(DatePicker.dateField, this.startDate, this.endDate);
                this.filterApplied = true;
            }
            const dateRangetext =  this.dataView.metadata?.objects?.sharedDateRange?.dateString;
            this.dateString = dateRangetext && dateRangetext //|| Utils.createDateString(this.startDate, this.endDate);
            console.log("DatePicker update - this.dateString, dateRangetext:", this.dateString, dateRangetext);
            console.log("DatePicker - update - !(this.previousDateString === this.dateString)", !(this.previousDateString === this.dateString));
            this.dateString && !(this.previousDateString === this.dateString) && this.splitAndApplyDateString(this.dateString);
        
            console.log("*** End of DatePicker update ***");
            
        }
        catch (error) {
            console.log("DatePicker - catch - error:", error)
        }
    }


}