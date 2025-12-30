/***************************************
 * DASHBOARD UI + DRILLDOWN HANDLERS
 ****************************************/

document.addEventListener("DOMContentLoaded", function () {

    /* ----------------------------------
     * KPI CALCULATIONS
     * ---------------------------------- */
    const financial = calculateFinancialOverview(salesBookData);
    const pendingDispatchInLakh = calculatePendingDispatch(orderBookData);
    const kpi = calculateKPIs(orderBookData, salesBookData);

    /* ----------------------------------
     * SET VALUES ON KPI CARDS
     * ---------------------------------- */
    document.getElementById("total-invoice").textContent = financial.totalInvoiceNumber;
    document.getElementById("outstanding-amount").textContent = `${financial.outstandingAmountInLakh.toFixed(2)} L`;
    document.getElementById("pending-dispatch").textContent = `${pendingDispatchInLakh.toFixed(2)} L`;

    document.getElementById("ytd-sale").textContent = kpi.ytdSales.toFixed(2);
    document.getElementById("avg-monthly-sale").textContent = kpi.avgMonthlySale.toFixed(2);
    document.getElementById("current-month-sale").textContent = kpi.currentMonthSales.toFixed(2);
    document.getElementById("completion-rate").textContent = kpi.completionRate.toFixed(1);


    /*****************************************
     * SLIDE-UP DRILLDOWN POPUP HANDLER
     *****************************************/
    window.openDrilldown = function(title, columns, rows) {
        document.getElementById("drilldown-title").textContent = title;

        document.getElementById("drilldown-head").innerHTML =
            "<tr>" + columns.map(c => `<th>${c}</th>`).join("") + "</tr>";

        document.getElementById("drilldown-body").innerHTML =
            rows.map(r =>
                "<tr>" + columns.map(c =>
                    `<td align='center'>${r[c] ?? ""}</td>`
                ).join("") + "</tr>"
        ).join("");

        const modal = document.getElementById("drilldown-modal");
        const overlay = document.getElementById("drilldown-overlay");

        overlay.style.display = "block";
        setTimeout(() => overlay.style.opacity = 1, 10);
        setTimeout(() => modal.style.bottom = "0", 20);
    };

    window.closeDrilldown = function() {
        const modal = document.getElementById("drilldown-modal");
        const overlay = document.getElementById("drilldown-overlay");

        modal.style.bottom = "-100%";
        overlay.style.opacity = 0;

        setTimeout(() => overlay.style.display = "none", 380);
    };


    /*****************************************
     * KPI CLICK EVENTS WITH LINKS
     *****************************************/

    document.getElementById("total-invoice").onclick = () => {
        const rows = salesBookData.map(s => ({
            invoiceNo: s.invoiceNo,
            date: s.date,
            dueDate: s.dueDate,
            value: s.value,
            link: s.link ? `<a href="${s.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
        }));
        openDrilldown("All Invoices", ["invoiceNo","date","dueDate","value","link"], rows);
    };

    document.getElementById("outstanding-amount").onclick = () => {
        const today = new Date("2025-12-20");
        const rows = salesBookData
            .filter(s => new Date(s.dueDate) <= today)
            .map(s => ({
                invoiceNo: s.invoiceNo,
                date: s.date,
                dueDate: s.dueDate,
                value: s.value,
                link: s.link ? `<a href="${s.link}" target="_blank" style="color:#d32f2f;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
            }));
        openDrilldown("Outstanding Invoices", ["invoiceNo","date","dueDate","value","link"], rows);
    };

    document.getElementById("pending-dispatch").onclick = () => {
        const rows = orderBookData
            .filter(o => (o.status || "").toLowerCase() === "incomplete")
            .map(o => ({
                date: o.date,
                poNumber: o.poNumber,
                jobName: o.jobName,
                orderQty: o.orderQty,
                dispQty: o.dispQty,
                status: o.status,
                value: o.value,
                link: o.link ? `<a href="${o.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
            }));
        openDrilldown("Pending Dispatch Orders", ["date","poNumber","jobName","orderQty","dispQty","status","value","link"], rows);
    };

    document.getElementById("ytd-sale").onclick = () => {
        const rows = salesBookData.map(s => ({
            invoiceNo: s.invoiceNo,
            date: s.date,
            value: s.value,
            link: s.link ? `<a href="${s.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
        }));
        openDrilldown("YTD Sales", ["invoiceNo","date","value","link"], rows);
    };

    document.getElementById("current-month-sale").onclick = () => {
        const month = new Date().toISOString().slice(0,7);
        const rows = salesBookData
            .filter(s => s.date && s.date.startsWith(month))
            .map(s => ({
                invoiceNo: s.invoiceNo,
                date: s.date,
                value: s.value,
                link: s.link ? `<a href="${s.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
            }));
        openDrilldown(`Current Month Sales (${month})`, ["invoiceNo","date","value","link"], rows);
    };

    document.getElementById("avg-monthly-sale").onclick = () => {
        const rows = salesBookData.map(s => ({
            month: s.date ? s.date.slice(0,7) : "",
            invoiceNo: s.invoiceNo,
            value: s.value,
            link: s.link ? `<a href="${s.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
        }));
        openDrilldown("Monthly Sales Details", ["month","invoiceNo","value","link"], rows);
    };


    /*****************************************
     * MONTHLY SALES CHART CLICK (linked)
     *****************************************/
    let monthlyChart;
    function renderMonthlyChart() {
        const series = prepareMonthlySalesSeries(salesBookData);
        const ctx = document.getElementById("monthlySalesChart").getContext("2d");

        if (monthlyChart) monthlyChart.destroy();

        monthlyChart = new Chart(ctx, {
            data: {
                labels: series.labels,
                datasets: [
                    { type:"bar", label:"Sales (Lakh)", data:series.sales, backgroundColor:series.barColors },
                    { type:"line", label:"% Growth", data:series.growth, borderColor:"#FF9800", yAxisID:"y1", tension:.35 },
                    { type:"line", label:"Cumulative", data:series.cumulative, borderColor:"#3f51b5", tension:.35 }
                ]
            },
            options:{
                responsive:true,
                scales:{ y:{beginAtZero:true}, y1:{position:"right"} },

                onClick:(e,elements)=>{
                    if(!elements.length) return;
                    const idx = elements[0].index;
                    const month = series.months[idx];

                    const rows = orderBookData
                        .filter(o => o.date && o.date.startsWith(month))
                        .map(o => ({
                            date: o.date,
                            poNumber: o.poNumber,
                            jobName: o.jobName,
                            status: o.status,
                            value: o.value,
                            link: o.link ? `<a href="${o.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
                        }));

                    openDrilldown(`Orders - ${series.labels[idx]}`,
                        ["date","poNumber","jobName","status","value","link"], rows);
                }
            }
        });
    }
    renderMonthlyChart();


    /*****************************************
     * MONTHLY PO CHART CLICK (linked)
     *****************************************/
    let monthlyPOChart;
    function renderMonthlyPOTrend() {
        const po = prepareMonthlyPOSeries(orderBookData);
        const ctx = document.getElementById("monthlyPOChart").getContext("2d");

        if (monthlyPOChart) monthlyPOChart.destroy();

        monthlyPOChart = new Chart(ctx, {
            data:{
                labels: po.labels,
                datasets:[
                    { type:"bar", label:"PO Count", data:po.poCount, backgroundColor:"#283593" },
                    { type:"line", label:"PO Value (Lakh)", data:po.poValue, borderColor:"#5c6bc0", tension:.35, yAxisID:"y1" }
                ]
            },
            options:{
                responsive:true,
                scales:{ y:{beginAtZero:true}, y1:{position:"right"} },

                onClick:(e,items)=>{
                    if(!items.length) return;
                    const idx = items[0].index;
                    const month = po.months[idx];

                    const rows = orderBookData
                        .filter(o => o.date && o.date.startsWith(month))
                        .map(o => ({
                            date: o.date,
                            poNumber: o.poNumber,
                            brand: o.brand,
                            orderQty: o.orderQty,
                            dispQty: o.dispQty,
                            status: o.status,
                            value: o.value,
                            link: o.link ? `<a href="${o.link}" target="_blank" style="color:#1a237e;text-decoration:underline;font-weight:600;">DOWNLOAD</a>` : ""
                        }));

                    openDrilldown(`PO Details - ${po.labels[idx]}`,
                        ["date","poNumber","brand","orderQty","dispQty","status","value","link"], rows
                    );
                }
            }
        });
    }
    renderMonthlyPOTrend();

}); // end DOMContentLoaded
