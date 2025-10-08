 const dateString = "2025-10-08 to 2025-10-23"
 function splitDateString(dateStr){
    const dates = dateStr.split(" to ")
    this.startDate = new Date(dates[0])
    this.endDate = new Date(dates[1])
 }

 console.log(splitDateString(dateString))