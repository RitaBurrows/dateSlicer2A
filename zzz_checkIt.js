const checkIt = {
    "roles": {
        "Time": true
    },
    "type": {
        "underlyingType": 519,
        "category": null,
        "temporalType": {
            "underlyingType": 519
        },
        "primitiveType": 7,
        "extendedType": 519,
        "categoryString": null,
        "text": false,
        "numeric": false,
        "integer": false,
        "bool": false,
        "dateTime": true,
        "duration": false,
        "binary": false,
        "json": false,
        "none": false,
        "temporal": {
            "underlyingType": 519
        }
    },
    "format": "G",
    "displayName": "Date_Full",
    "queryName": "Reporting DateInformation.Date_Full",
    "expr": {
        "_kind": 2,
        "source": {
            "_kind": 0,
            "entity": "Reporting DateInformation",
            "variable": "r",
            "kind": 0
        },
        "ref": "Date_Full",
        "kind": 2
    },
    "sort": 1,
    "sortOrder": 0,
    "rolesIndex": {
        "Time": [
            0
        ]
    },
    "index": 0,
    "identityExprs": [
        {
            "_kind": 2,
            "source": {
                "_kind": 0,
                "entity": "Reporting DateInformation",
                "kind": 0
            },
            "ref": "Date_Full",
            "kind": 2
        }
    ]
}




        let totalDays = props.daysInWeek * props.weeksInMonth; // 42 slots
        const daysInMonth = Utils.getNumberofDaysInCurrMonth(this.currentYear, this.currentMonth);
        let firstDayOfMonth = Utils.getFirstDayOfMonth(this.currentYear, this.currentMonth); // 0=Sun, 1=Mon, ..., 6=Sat

        firstDayOfMonth = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
        //firstDayOfMonth = (firstDayOfMonth + 6) % 7;
        const daysInPrevMonth = Utils.getNumberofDaysInPrevMonth(this.currentYear, this.currentMonth);

        let daysArray: { day: number, inMonth: boolean, date: Date }[] = [];
        // Fill previous month's trailing days

        for (let i = 0; i < firstDayOfMonth; i++) {
            const date = new Date(this.currentYear, this.currentMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1);
            daysArray.push({
                day: date.getDate(),
                inMonth: false,
                date
            });

        }
        // Fill current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this.currentYear, this.currentMonth, d);
            daysArray.push({ day: d, inMonth: true, date });
        }
        // Fill next month leading days until 42 cells
        let nextDay = 1;
        while (daysArray.length < 42) {
            const date = new Date(this.currentYear, this.currentMonth + 1, nextDay++);
            daysArray.push({ day: date.getDate(), inMonth: false, date });
        }

        
        const dayGroups = this.calendarSvg.selectAll(".dayGroup")
            .data(daysArray)
            .enter()
            .append("g")
            .attr("class", "dayGroup")
            .attr("transform", (d, i) => {
                const x = startX + (i % props.daysInWeek) * props.cellWidth;
                const y = startY + Math.floor(i / props.daysInWeek) * props.cellHeight;
                return `translate(${x}, ${y})`;
            });

        // Function to check if a date is within the highlight range
        const inHighlightRange = (cellDate: Date): boolean => {
            if (!this.highlightStart || !this.highlightEnd) return false;
            return cellDate >= this.highlightStart && cellDate <= this.highlightEnd;
        };
        // Background rect
        dayGroups.append("rect")
            .attr("class", "dayCell")
            .attr("width", props.cellWidth - props.cellPadding)
            .attr("height", props.cellHeight - props.cellPadding)
            .style("fill", d => {
                if (inHighlightRange(d.date)) {
                    return "#B3D1F0"; // highlight color
                }
                return "#ffffff"; // normal
            });

        // Circle for today
        dayGroups.filter(d =>
            d.inMonth &&
            this.currentYear === today.getFullYear() &&
            this.currentMonth === today.getMonth() &&
            d.day === today.getDate()
        ).append("circle")
            .attr("cx", (props.cellWidth - props.cellPadding) / 2)
            .attr("cy", (props.cellHeight - props.cellPadding) / 2)
            .attr("r", Math.min(props.cellWidth, props.cellHeight) / 2 - props.cellPadding)
            .style("fill", "#255A91")
        //.style("opacity", 0.2);

        // Day number text
        dayGroups.append("text")
            .attr("class", "dayNumber")
            .attr("x", props.textXOffset)
            .attr("y", props.textYOffset)
            .attr("font-size", "12px")
            //.attr("fill", "#")
            .style("fill", d => d.inMonth ? "#255A91" : "#999")
            .style("font-weight", d =>
                d.inMonth &&
                    this.currentYear === today.getFullYear() &&
                    this.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "bold" : "normal")
            .style("fill", d =>
                d.inMonth &&
                    this.currentYear === today.getFullYear() &&
                    this.currentMonth === today.getMonth() &&
                    d.day === today.getDate() ? "white" : d.inMonth ? "#255A91" : "#999")
            .text(d => d.day);

        dayGroups.on("click", (event, d) => {
            if (!this.calendarInteractive) return;
            this.targetInput.value = Utils.formatDate(d.date);
            this.calendarInteractive = false;  // hide calendar after selection

            //this.startDateInput.value = event.target.id === "startInput" ? Utils.formatDate(d.date) : this.startDateInput.value;
            //this.endDateInput.value = event.target.id === "endInput" ? Utils.formatDate(d.date) : this.endDateInput.value;
            this.updateCalendarVisibility(false);
            this.targetInput = null;
        });
        this.updateCalendarVisibility(this.calendarInteractive);