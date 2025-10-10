export class Utils {

    public static formatDate(date: Date, stringType: string): string {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return stringType === "inputBox" ? `${day}/${month}/${year}` : `${year}-${month}-${day}`;
    }

    public static createDateString(startDate: Date, endDate: Date){
        return `${this.formatDate(startDate, "sharedState")} to ${Utils.formatDate(endDate, "sharedState")}`;
    }

    public static getNormalisedYearStart(date: Date): Date {
            return new Date(date.getFullYear(), 0, 1);
    }
    
    public static normaliseStartDate(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    public static normaliseEndDate(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    }

    public static getFirstDayOfMonth(year: number, month: number): number {
        return new Date(year, month, 1).getDay();
    }

    public static getNumberofDaysInCurrMonth(year: number, month: number): number {
        return new Date(year, month + 1, 0).getDate();
    }

    public static getNumberofDaysInPrevMonth(year: number, month: number): number {
        return new Date(year, month, 0).getDate();
    }
}
