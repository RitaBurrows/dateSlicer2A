//"use strict";

import powerbiVisualsApi from "powerbi-visuals-api";
import { AdvancedFilter } from "powerbi-models";
import * as d3 from "d3";
import { select as d3Select, selectAll as d3SelectAll, Selection as D3Selection, } from "d3-selection";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbiVisualsApi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbiVisualsApi.extensibility.visual.IVisual;
import DataView = powerbiVisualsApi.DataView;
import DataViewMetadataColumn = powerbiVisualsApi.DataViewMetadataColumn
import DataViewPropertyValue = powerbiVisualsApi.DataViewPropertyValue;
import IVisualHost = powerbiVisualsApi.extensibility.visual.IVisualHost;

import "./../style/visual.less";
import { Utils } from "./utils";
import {
    DateRangeType,
    DateRangePeriod
} from "./calendarTypes"

export class DatePicker implements IVisual {
    private calendarIconEndDate: D3Selection<any, any, any, any>;
    private calendarIconStartDate: D3Selection<any, any, any, any>;
    private calendarInputEnabled: boolean = false;
    private customDateContainer: D3Selection<any, any, any, any>;
    private dataView: powerbiVisualsApi.DataView;
    private static dateField: DataViewMetadataColumn | null;
    private dateString: DataViewPropertyValue | null
    private dateInputContainer: D3Selection<any, any, any, any>;
    private dateRangeContainer: D3Selection<any, any, any, any>;
    private dateRangeDropDown: D3Selection<any, any, any, any>;
    private dateRangeType: DateRangeType = "This";
    private dateRangePeriod: DateRangePeriod = "Year";
    private endDate: Date = Utils.normaliseEndDate(new Date());
    private endDateInput: HTMLInputElement;
    private endDateInputContainer: D3Selection<any, any, any, any>;
    private filterApplied: boolean = false;
    private host: IVisualHost;
    private jsonFilters: AdvancedFilter[] = [];
    private previousDateString: DataViewPropertyValue | null = null;
    private rangeTypeDropDown: D3Selection<any, any, any, any>;    
    private rangeQuantityInput: HTMLInputElement;
    private rangePeriodDropDown: D3Selection<any, any, any, any>;
    private startDate: Date = Utils.getNormalisedYearStart(new Date());
    private startDateInput: HTMLInputElement;
    private startDateInputContainer: D3Selection<any, any, any, any>;
    private rootSelection: D3Selection<any, any, any, any>;

    private getDateRange(type: DateRangeType, quantityInput: string, period: DateRangePeriod): void {
        console.log("DatePicker getDateRange - type, quantityInput, period", type, quantityInput, period)
        const now = new Date();
        const quantity = typeof Number(quantityInput) === "number" && Number(quantityInput) || null

        if (type === "This") {
            this.endDate = now;

            switch (period) {
                case "Day":
                case "Days":
                    this.startDate = new Date(now);
                    this.startDate.setHours(0, 0, 0, 0);
                    break;
                case "Week":
                case "Weeks":
                    this.startDate = new Date(now);
                    this.startDate.setDate(now.getDate() - (now.getDay() + 6) % 7); // start of week (Sunday) 
                    this.startDate.setHours(0, 0, 0, 0);
                    break;
                case "Month":
                case "Months":
                    this.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case "Year":
                case "Years":
                    this.startDate = new Date(now.getFullYear(), 0, 1);
                    break;
                default:
                    throw new Error("Invalid date range type");
            }
        } else if (type === "Last") {
            this.endDate = new Date(now);

            switch (period) {
                case "Day":
                case "Days":
                    this.startDate = new Date(now);
                    this.startDate.setDate(now.getDate() - quantity);
                    break;
                case "Week":
                case "Weeks":
                    this.startDate = new Date(now);
                    this.startDate.setDate(now.getDate() - quantity * 7);
                    break;
                case "Month":
                case "Months":
                    this.startDate = new Date(now);
                    this.startDate.setMonth(now.getMonth() - quantity);
                    break;
                case "Year":
                case "Years":
                    this.startDate = new Date(now);
                    this.startDate.setFullYear(now.getFullYear() - quantity);
                    break;
                default:
                    throw new Error("Invalid date range period");
            }
        } else {
           this.rangeQuantityInput.value = "-"
        }
 
        this.startDate.setHours(0, 0, 0, 0);
        this.endDate.setHours(23, 59, 59, 999);
        this.startDateInput.value = Utils.formatDate(this.startDate, "inputBox");        
        this.endDateInput.value = Utils.formatDate(this.endDate, "inputBox");
        
        console.log("DatePicker getDateRange - this.startDate, this.endDate", this.startDate, this.endDate)
    }

    public getFilterAction(startDate: Date, endDate: Date): powerbiVisualsApi.FilterAction {
        return startDate !== undefined
            && endDate !== undefined
            && startDate !== null
            && endDate !== null
            ? powerbiVisualsApi.FilterAction.merge
            : powerbiVisualsApi.FilterAction.remove;
    }

    private createFilter(datefield: DataViewMetadataColumn, startDate: Date, endDate: Date): AdvancedFilter  {
        console.log("DatePicker - createFilter - startDate, endDate:", startDate, endDate);
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
            return filter
        }
    }

    private applyFilter(filter: AdvancedFilter){
        this.jsonFilters = [filter]
        this.host.applyJsonFilter(
            filter,
            "general",
            "filter",
            this.getFilterAction(this.startDate, this.endDate)
        );
    }

    private splitAndApplyDateString(dateStr: any) {
        this.previousDateString = dateStr;
        const dates = dateStr.split(" to ")
        this.startDate = new Date(dates[0])
        this.endDate = Utils.normaliseEndDate(new Date(dates[1]))
        this.startDateInput.value = Utils.formatDate(this.startDate, "inputBox");
        this.endDateInput.value = Utils.formatDate(this.endDate, "inputBox");
        console.log("DatePicker - splitAndApplyDateString - this.startDate, this.endDate:", this.startDate, this.endDate)
    }

    private updateSharedState(startDate: Date, endDate: Date) {
        const sharedState = Utils.createDateString(startDate, endDate);
        console.log("DatePicker - updateSharedState - sharedState", sharedState)
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
            .classed("dateRangeContainer", true)
        this.dateRangeContainer
            .append("div")
            .classed("containerLabel", true)
            .text("Day, Week, Month, Year, All");

        this.rangeTypeDropDown = this.dateRangeContainer
            .append("select")
            .classed("rangeTypeDropDown", true);
        const rangeTypes = [ "This", "Last", "Custom" ]; 
        this.rangeTypeDropDown        
            .selectAll("option")
            .data(rangeTypes)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
            .property("selected", d => this.dateRangeType && d === this.dateRangeType);
        this.rangeTypeDropDown
            .on("change", (event: any) => {
                const selectElement = event.target as HTMLSelectElement;
                const value = selectElement.value as DateRangeType;
                this.dateRangeType = value;
                this.calendarInputEnabled = value === "Custom";
                if (value === "This"){
                    this.rangeQuantityInput.value = "-";
                } else if (value === "Last"){     
                this.rangeQuantityInput.value = "1";
                }
                d3Select(this.rangeQuantityInput)
                    .classed("disabled", this.dateRangeType === "This")
                this.getDateRange(value, this.rangeQuantityInput.value, this.dateRangePeriod);
                this.customDateContainer
                    .style("pointer-events", value === "Custom" ? "auto" : "none")
                    .style("opacity", value === "Custom" ? 1 : 0.5);
                this.updateSharedState(this.startDate, this.endDate);
                if (value !== "Custom" && DatePicker.dateField) {
                    const filter = this.createFilter(DatePicker.dateField, this.startDate, this.endDate)
                    this.applyFilter(filter);
                }
            });
            
        this.rangeQuantityInput = this.dateRangeContainer
            .append("input")
            .attr("type", this.dateRangeType === "Last" ? "number": "string")
            .attr("id", "rangeQuantity")
            .attr("min", 1)
            .style("text-align", "center")
            .classed("disabled", this.dateRangeType === "This")
            .property("value", "-")
            .on("input", Utils.debounceFiltering((event: Event) => { 
                const value = (event.target as HTMLInputElement).value.trim();
                const valueNumber = Number(value);
                if(!Number.isFinite(valueNumber) || valueNumber <=0){
                     this.rangeQuantityInput.style.border = "2px solid red";
                     return;
                } else {
                    this.rangeQuantityInput.style.border = "0.5px solid #255A91";
                }
                this.getDateRange(this.dateRangeType, value, this.dateRangePeriod);                 
                this.updateSharedState(this.startDate, this.endDate);
                const filter = this.createFilter(DatePicker.dateField, this.startDate, this.endDate)
                this.applyFilter(filter);
            }, 300))
            .node() as HTMLInputElement;

        this.rangePeriodDropDown = this.dateRangeContainer
            .append("select")
            .classed("rangeTypeDropDown", true);
        const rangePeriodsThis = [ "Day", "Week", "Month", "Year" ];
        const rangPeriodsLast = [ "Days", "Weeks", "Months", "Years" ];
        this.rangePeriodDropDown        
            .selectAll("option")
            .data(this.dateRangeType === "This" ? rangePeriodsThis : rangPeriodsLast)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d)
            .property("selected", d => this.dateRangePeriod && d === this.dateRangePeriod);
        this.rangePeriodDropDown
            .on("change", (event: any) => {
                const selectElement = event.target as HTMLSelectElement;
                const value = selectElement.value as DateRangePeriod;
                this.dateRangePeriod = value;
                this.getDateRange(this.dateRangeType, this.rangeQuantityInput.value, this.dateRangePeriod);
                this.updateSharedState(this.startDate, this.endDate);
                console.log("DatePicker - constructor - this.dateRangeDropDown - onChange - this.dateString:", this.dateString);
                if (this.dateRangeType !== "Custom" && DatePicker.dateField) {
                    this.calendarInputEnabled = false;
                    const filter = this.createFilter(DatePicker.dateField, this.startDate, this.endDate)
                    this.applyFilter(filter);
                }
            });
        const isDisabled = !this.calendarInputEnabled ? "disabled" : "";
        this.customDateContainer = this.rootSelection
            .append("div")
            .classed(`customDateContainer ${isDisabled}`, true);
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
                DatePicker.dateField = this.dataView.metadata.columns.find(col => col.roles && col.roles["Time"]);
                if (!DatePicker.dateField) {
                    console.log("DatePicker update: No dateField found");
                    return;
                }
            }

            if (!this.filterApplied) {
                console.log("DatePicker update - !this.filterApplied (filter not applied:", !this.filterApplied);
                this.getDateRange(this.dateRangeType, "-", this.dateRangePeriod);                 
                this.updateSharedState(this.startDate, this.endDate);
                const filter = this.createFilter(DatePicker.dateField, this.startDate, this.endDate)
                this.applyFilter(filter);
                this.filterApplied = true;
            }
            const dateRangetext = this.dataView.metadata?.objects?.sharedDateRange?.dateString;
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