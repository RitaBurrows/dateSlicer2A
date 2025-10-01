    private drawCalendar2(): void { 

        if (!this.calendarSvg) return; 
        const props = this.calendarProperties; 
        const startX = props.startXpoint + props.leftMargin; 
        const startY = props.startYpoint + props.topMargin; 
        // Clear any existing calendar elements 
        this.calendarSvg.selectAll("*").remove(); 

        // Set SVG width/height 
        this.calendarSvg 
            .attr("width", 7 * props.cellWidth + props.leftMargin + props.rightMargin) 
            .attr("height", 7 * props.cellHeight + props.topMargin + props.bottomMargin); 

            // Month label 

        const monthNames = [ 
            "January","February","March","April","May","June", "July","August","September","October","November","December" 
        ]; 
        this.calendarSvg.append("text") 
            .attr("x", startX + (props.daysInWeek * props.cellWidth)/2) 
            .attr("y", startY - props.weekdayLabelHeight) 
            .attr("text-anchor", "middle") 
            .attr("font-size", "18px") 
            .attr("fill", "#255A91") 
            .text(`${monthNames[this.currentMonth]} ${this.currentYear}`); 

        // Weekday labels 
        const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]; 
        this.calendarSvg.selectAll(".weekdayLabel") 
            .data(weekdays) 
            .enter() 
            .append("text") 
            .classed("weekdayLabel", true) 
            .attr("x", (d, i) => startX + i * props.cellWidth + props.textXOffset) 
            .attr("y", startY - props.weekdayLabelHeight / 2) 
            .attr("font-size", "14px") 
            .attr("fill", "#255A91") 
            .text(d => d); 

        // Calculate day cells 

        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.currentYear, this.currentMonth); 
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.currentYear, this.currentMonth); 
        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); // make Monday first 
        let daysArray: { day: number, inMonth: boolean, date: Date }[] = []; 

        // Previous month trailing days 
        const prevMonthDays = Utils.getNumberofDaysInPrevMonth(this.currentYear, this.currentMonth); 
        for (let i = 0; i < firstDayOfMonth; i++) { 
            const date = new Date(this.currentYear, this.currentMonth - 1, prevMonthDays - firstDayOfMonth + i + 1); 
            daysArray.push({ day: date.getDate(), inMonth: false, date }); 
        } 

        // Current month 
        for (let d = 1; d <= daysInMonth; d++) { 
            const date = new Date(this.currentYear, this.currentMonth, d); 
            daysArray.push({ day: d, inMonth: true, date }); 
        } 


        // Next month leading days until 42 cells 
        let nextDay = 1; 
        while (daysArray.length < 42) { 
            const date = new Date(this.currentYear, this.currentMonth + 1, nextDay++); 
            daysArray.push({ day: date.getDate(), inMonth: false, date }); 
        } 
    
        // Render day cells 
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
    
        // Highlight selected range 
        const inHighlightRange = (date: Date) => { 
            if (!this.highlightStart || !this.highlightEnd) return false; 
            return date >= this.highlightStart && date <= this.highlightEnd; 
        }; 
    
        dayGroups.append("rect") 
            .attr("width", props.cellWidth - props.cellPadding) 
            .attr("height", props.cellHeight - props.cellPadding) 
            .attr("fill", d => inHighlightRange(d.date) ? "#B3D1F0" : "#ffffff") 
            .attr("stroke", "#ccc"); 
    
        // Day number text 
        dayGroups.append("text") 
            .attr("x", props.textXOffset) 
            .attr("y", props.textYOffset) 
            .attr("font-size", "12px") 
            .attr("fill", d => d.inMonth ? "#255A91" : "#999") 
            .text(d => d.day); 
    

        // Click to select date 
        dayGroups.on("click", (event, d) => { 
            if (!this.calendarInteractive || !this.targetInput) return; 
            this.targetInput.value = Utils.formatDate(d.date); 
            this.highlightStart = new Date(d.date); 
            this.calendarInteractive = false; 
            this.updateCalendarVisibility(false); 
            this.targetInput = null; 
        }); 
    } 