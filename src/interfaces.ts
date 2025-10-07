export interface ICalendarDatePeriods {
    currentMonth: number;
    currentYear: number;
    endDate: Date;
    previousEndDate: Date | null;
    previousStartDate: Date | null;
    startDate: Date;
}

export interface ICalendarMargins {
    LeftMargin: number;
    RightMargin: number;
    TopMargin: number;
    BottomMargin: number;
    CellWidth: number;
    CellHeight: number;
    CellPadding: number;
    StartXpoint: number;
    StartYpoint: number;
    HeaderHeight: number;
    WeekdayLabelHeight: number;
}

export interface ICalendarProperties {
    daysInWeek: number;
    weeksInMonth: number;
    leftMargin: number;
    rightMargin: number;
    topMargin: number;
    bottomMargin: number;
    cellWidth: number;
    cellHeight: number;
    cellPadding: number;
    startXpoint: number;
    startYpoint: number;
    headerHeight: number;
    weekdayLabelHeight: number;
    textXOffset: number;
    textYOffset: number;
}