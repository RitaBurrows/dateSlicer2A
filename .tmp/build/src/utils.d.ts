export declare class Utils {
    static debounceFiltering<F extends (...args: any[]) => void>(func: F, wait: number): (...args: Parameters<F>) => void;
    static formatDate(date: Date, stringType: string): string;
    static createDateString(startDate: Date, endDate: Date): string;
    static getNormalisedYearStart(date: Date): Date;
    static normaliseStartDate(date: Date): Date;
    static normaliseEndDate(date: Date): Date;
    static getFirstDayOfMonth(year: number, month: number): number;
    static getNumberofDaysInCurrMonth(year: number, month: number): number;
    static getNumberofDaysInPrevMonth(year: number, month: number): number;
}
