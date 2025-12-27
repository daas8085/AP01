/***************************************
 * DASHBOARD UI + DRILLDOWN HANDLERS
 ****************************************/

document.addEventListener("DOMContentLoaded", function () {

    /* ---- KPI CALCULATIONS ---- */
    const financial = calculateFinancialOverview(salesBookData);
    const pendingDispatchInLakh = calculatePendingDispatch(orderBookData);
    const kpi = calculateKPIs(orderBookData, salesBookData);

    /* ---- SET VALUES ON SCREEN ---- */
    document.getElementById("total-invoice").textContent = financial.totalInvoiceNumber;
    document.getElementById("outstanding-amount").textContent = `${financial.outstandingAmountInLakh.toFixed(2)} L`;
    document.getElementById("pending-dispatch").textContent = `${pendingDispatchInLakh.toFixed(2)} L`;

    document.getElementById("ytd-sale").textContent = kpi.ytdSales.toFixed(2);
    document.getElementById("avg-monthly-sale").textContent = kpi.avgMonthlySale.toFixed(2);
    /*document.getElementById("total-po").textContent = kpi.uniquePOs;*/
    document.getElementById("current-month-sale").textContent = kpi.currentMonthSales.toFixed(2);
    /*document.getElementById("total-sku").textContent = kpi.totalSKU; */
    document.getElementById("completion-rate").textContent = kpi.completionRate.toFixed(1);


    /* ==== OPEN SLIDE-UP SHEET ==== */
window.openDrilldown = function(title, columns, rows) {
    document.getElementById("drilldown-title").textContent = title;

    document.getElementById("drilldown-head").innerHTML =
        "<tr>" + columns.map(c => `<th>${c}</th>`).join("") + "</tr>";

    document.getElementById("drilldown-body").innerHTML =
        rows.map(r =>
            "<tr>" + columns.map(c => `<td align="center">${r[c] ?? ""}</td>`).join("") + "</tr>" //cell data allingment
        ).join("");

    const modal = document.getElementById("drilldown-modal");
    const overlay = document.getElementById("drilldown-overlay");

    overlay.style.display = "block";
    setTimeout(() => overlay.style.opacity = 1, 10);

    setTimeout(() => {
        modal.style.bottom = "0";
    }, 20);
};


/* ==== CLOSE SLIDE-UP SHEET ==== */
window.closeDrilldown = function() {
    const modal = document.getElementById("drilldown-modal");
    const overlay = document.getElementById("drilldown-overlay");

    modal.style.bottom = "-100%";
    overlay.style.opacity = 0;

    setTimeout(() => overlay.style.display = "none", 380);
};


/* ==== DRAG-DOWN TO CLOSE ==== */
let startY = 0;
let currentY = 0;

const modal = document.getElementById("drilldown-modal");
const handle = document.getElementById("drag-handle");

handle.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
});

handle.addEventListener("touchmove", (e) => {
    currentY = e.touches[0].clientY - startY;
    if (currentY > 0) {
        modal.style.bottom = `-${currentY}px`;
    }
});

handle.addEventListener("touchend", () => {
    if (currentY > 120) {
        closeDrilldown();
    } else {
        modal.style.bottom = "0";
    }
});

    /*****************************************
     * 9 KPI CLICK-TO-DRILLDOWN MAPPING
     *****************************************/

    /* 1. Total Invoice Number → grouped invoices */
    document.getElementById("total-invoice").onclick = () => {
        const rows = salesBookData.map(s => ({
            invoiceNo: s.invoiceNo,
            date: s.date,
            value: s.value,
            dueDate: s.dueDate
        }));
        openDrilldown("All Invoices", ["invoiceNo", "date", "dueDate", "value"], rows);
    };

    /* 2. Outstanding Amount → overdue invoices */
    document.getElementById("outstanding-amount").onclick = () => {
        const today = new Date("2025-12-20");
        const rows = salesBookData.filter(s => new Date(s.dueDate) <= today);
        openDrilldown("Outstanding Invoices (Overdue)", ["invoiceNo", "date", "dueDate", "value"], rows);
    };

    /* 3. Pending Dispatch → incomplete orders */
    document.getElementById("pending-dispatch").onclick = () => {
        const rows = orderBookData.filter(o => (o.status || "").toLowerCase() === "incomplete");
        openDrilldown("Pending Dispatch Orders", ["poNumber", "jobName", "brand", "orderQty", "dispQty", "status", "value"], rows);
    };

    /* 4. YTD Sale → invoice list */
    document.getElementById("ytd-sale")?.addEventListener("click", () => {
        openDrilldown("YTD Sale - Invoice Details", ["invoiceNo", "date", "value"], salesBookData);
    });

    /* 5. Total PO → PO list */
    document.getElementById("total-po")?.addEventListener("click", () => {
        const rows = orderBookData.map(o => ({
            poNumber: o.poNumber,
            jobName: o.jobName,
            brand: o.brand,
            orderQty: o.orderQty,
            dispQty: o.dispQty,
            status: o.status,
            value: o.value
        }));
        openDrilldown("All Purchase Orders", ["poNumber", "jobName", "brand", "orderQty", "dispQty", "status", "value"], rows);
    });

    /* 6. Current Month Sale → this month invoices */
    document.getElementById("current-month-sale")?.addEventListener("click", () => {
        const rows = salesBookData.filter(s => (s.date || "").startsWith(""));
        openDrilldown("Current Month Sales", ["invoiceNo", "date", "value"], rows);
    });

    /* 7. Top SKUs render (list inside scroll box) */
const { top: topSKUs, totalDispatchQty } = prepareTopSKUs(orderBookData, 10); // e.g. top 10
const skusContainer = document.getElementById("skus-container");
if (skusContainer) {
    skusContainer.innerHTML = "";
    topSKUs.forEach((sku, idx) => {
        const card = document.createElement("div");
        card.className = "sku-card";

        const shortName =
            sku.jobName && sku.jobName.length > 60
                ? sku.jobName.substring(0, 60) + "..."
                : sku.jobName || "";

        card.innerHTML = `
            <div class="sku-rank">${idx + 1}</div>
            <div class="sku-brand">${sku.brand || ""}</div>
            <div class="sku-name" title="${sku.jobName || ""}">${shortName}</div>
            <div class="sku-details">
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${(sku.totalDispatch || 0).toLocaleString()}</div>
                    <div class="sku-detail-label">Dispatch Qty</div>
                </div>
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${(sku.totalOrder || 0).toLocaleString()}</div>
                    <div class="sku-detail-label">Order Qty</div>
                </div>
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${sku.poCount || 0}</div>
                    <div class="sku-detail-label">POs</div>
                </div>
            </div>
        `;
        skusContainer.appendChild(card);
    });
}

    /* 8. Completion Rate → completed orders */
    document.getElementById("kpi-completion-rate")?.addEventListener("click", () => {
        const rows = orderBookData.filter(o => (o.status || "").toLowerCase() === "complete");
        openDrilldown("Completed Orders", ["poNumber", "jobName", "brand", "orderQty", "dispQty", "value"], rows);
    });

    /* 9. Avg Monthly Sale → grouped by month */
    document.getElementById("kpi-avg-month-sale")?.addEventListener("click", () => {
        const rows = salesBookData.map(s => ({
            month: s.date ? s.date.slice(0, 10) : "2024-Apr", // adjusted for date format   
            invoiceNo: s.invoiceNo,
            value: s.value
        }));
        openDrilldown("Monthly Sales Details", ["month", "invoiceNo", "value"], rows);
    });


   /* MONTHLY SALES COMBO CHART WITH GROWTH + YTD */

let monthlyChart;
function renderMonthlyChart(metric="sales") {

    const series = prepareMonthlySalesSeries(salesBookData);
    const ctx = document.getElementById("monthlySalesChart").getContext("2d");

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
        data: {
            labels: series.labels,

            datasets: [
                // ==== BAR SALES ====
                {
                    type: "bar",
                    label: "Sales (Lakh)",
                    data: series.sales,
                    backgroundColor: series.barColors,
                    order: 1
                },

                // ==== LINE GROWTH ====
                {
                    type: "line",
                    label: "% Growth",
                    data: series.growth,
                    borderColor: "#FF9800",
                    borderWidth: 2,
                    yAxisID: "y1",
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: "#FF9800",
                    order: 2
                },

                // ==== LINE YTD ====
                {
                    type: "line",
                    label: "Cumulative YTD",
                    data: series.cumulative,
                    borderColor: "#3f51b5",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "#3f51b5",
                    tension: 0.35,
                    order: 3
                }
            ]
        },

        options: {
            responsive: true,
            interaction: { mode: "index", intersect: false },

            scales: {
                y: { beginAtZero: true, title: { display: true, text: "Sales (Lakh)" } },
                y1: { position: "right", title: { display: true, text: "% Growth" } }
            },

            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            if (ctx.dataset.label === "% Growth") return `Growth: ${ctx.raw.toFixed(2)} %`;
                            if (ctx.dataset.label === "Cumulative YTD") return `YTD: ${ctx.raw.toFixed(2)} L`;
                            return `Sales: ${ctx.raw.toFixed(2)} L`;
                        }
                    }
                }
            },

            // Drill-down click
            onClick: (e, elements) => {
                if (!elements.length) return;
                const idx = elements[0].index;
                const monthKey = series.months[idx];
                const rows = salesBookData.filter(s => (s.date || "2025-Apr").startsWith(monthKey));
                const [year, month] = monthKey.split("-");
                const monthName = new Date(year, month - 1)
                    .toLocaleString("default", { month: "long", year: "numeric" });
                openDrilldown(`Sales - ${monthName}`, ["date", "invoiceNo", "value"], rows);
            }
        }
    });
}

// INITIAL RENDER
renderMonthlyChart();

/* ==== MONTHLY PO TREND (COMBO CHART) ==== */
let monthlyPOChart;
function renderMonthlyPOTrend() {
    const po = prepareMonthlyPOSeries(orderBookData);
    const ctx = document.getElementById("monthlyPOChart").getContext("2d");

    if (monthlyPOChart) monthlyPOChart.destroy();

    monthlyPOChart = new Chart(ctx, {
        data: {
            labels: po.labels,
            datasets: [
                {   // BAR: PO COUNT
                    type: "bar",
                    label: "PO Count",
                    data: po.poCount,
                    backgroundColor: "#283593",
                    order: 1
                },
                {   // LINE: PO VALUE
                    type: "line",
                    label: "PO Value (Lakh)",
                    data: po.poValue,
                    borderColor: "#5c6bc0",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "#5c6bc0",
                    tension: 0.35,
                    order: 2
                }
            ]
        },

        options: {
            responsive: true,
            interaction: { mode:"index", intersect:false },

            scales: {
                y: { beginAtZero:true, title:{ display:true, text:"PO Count"} },
                y1: { position:"right", title:{ display:true, text:"PO Value (Lakh)" } }
            },

            // CLICK = DRILLDOWN (List of POs for that month)
            onClick:(e, items)=>{
                if (!items.length) return;
                const idx = items[0].index;
                const monthKey = po.months[idx];
                const rows = orderBookData.filter(o => (o.date || "").startsWith(monthKey));
                const [year, month] = monthKey.split("-");
                const title = new Date(year, month-1).toLocaleString("default",{month:"long",year:"numeric"});
                openDrilldown(`PO Details -${title}`, 
                    ["date","poNumber","brand","orderQty","dispQty","value","status"], rows);
            }
        }
    });
}

// INITIAL CALL
renderMonthlyPOTrend();



});
