export declare class Utils {
    static formatDate(date: Date): string;
    static getNormalisedYearStart(date: Date): Date;
    static getNormalisedYearEnd(date: Date): Date;
    static normaliseStartDate(date: Date): Date;
    static normaliseEndDate(date: Date): Date;
    static getFirstDayOfMonth(year: number, month: number): number;
    static getNumberofDaysInCurrMonth(year: number, month: number): number;
    static getNumberofDaysInPrevMonth(year: number, month: number): number;
}
