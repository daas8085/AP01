// ===== UTIL =====
function sumBy(arr, selector) {
    return arr.reduce((s, x) => s + (selector(x) || 0), 0);
}
function monthKey(dateStr) {
    return dateStr ? dateStr.slice(0, 7) : "";
}



// ===== 1. FINANCIAL OVERVIEW =====
function calculateFinancialOverview(salesBook, todayStr = "2025-12-20") {
    const uniqueInvoices = new Set(salesBook.map(x => x.invoiceNo)).size;

    const today = new Date(todayStr);
    let outstandingAmount = 0;

    salesBook.forEach(inv => {
        const due = new Date(inv.dueDate);
        if (due <= today) outstandingAmount += (inv.value || 0);
    });

    return {
        totalInvoiceNumber: uniqueInvoices,
        outstandingAmountInLakh: outstandingAmount / 100000
    };
}


// ===== 2. PENDING DISPATCH (Option B — Remaining Value) ===== due to recent edits

    function calculatePendingDispatch(orderBook) {
        let totalRemaining = 0;

        orderBook.forEach(o => {
             if ((o.status || "").toLowerCase() === "incomplete" && o.value) {
            totalRemaining += o.value;
        }
    });

        return totalRemaining / 100000;
    
}

/*
function calculatePendingDispatch(orderBook) {
    let totalIncompleteValue = 0;

    orderBook.forEach(o => {
        if ((o.status || "").toLowerCase() === "incomplete" && o.value) {
            totalIncompleteValue += o.value;
        }
    });

    return totalIncompleteValue / 100000;  // convert to lakh
}




*/
// ===== 3. KPI CALCULATIONS =====
function calculateKPIs(orderBook, salesBook) {
    const normalizedSales = salesBook.map(x => ({
        ...x,
        date: x.date ? x.date.slice(0,10) : ""
    }));

    const ytdSales = sumBy(normalizedSales, x => x.value) / 100000;

    const uniqueMonths = new Set(
        normalizedSales.map(x => monthKey(x.date)).filter(Boolean)
    );
    const avgMonthlySale = ytdSales / (uniqueMonths.size || 1);

    const uniquePOs = new Set(orderBook.map(x => x.poNumber)).size;

    const now = new Date();
    const currentMonth = now.toISOString().slice(0,7);

    const currentMonthSales = sumBy(
        normalizedSales.filter(x => monthKey(x.date) === currentMonth),
        x => x.value
    ) / 100000;

    const totalSKU = new Set(orderBook.map(x => x.jobName)).size;

    const totalPOValue = sumBy(orderBook, x => x.value);
    const completeValue = sumBy(orderBook.filter(o => (o.status||"").toLowerCase()==="complete"), x=>x.value);
    const completionRate = totalPOValue ? (completeValue / totalPOValue) * 100 : 0;

    return {
        ytdSales,
        avgMonthlySale,
        uniquePOs,
        currentMonthSales,
        totalSKU,
        completionRate,
        totalPOValue: totalPOValue / 100000,
        completeValue: completeValue / 100000
    };
}


// ===== 4. MONTHLY SALES SERIES =====
function prepareMonthlySalesSeries(salesBook) {
    const months = ["2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01"];
    const labels = ["July 2025","August 2025","September 2025","October 2025","November 2025","December 2025","January 2026"];

    const sales = months.map(m =>
        sumBy(salesBook.filter(s => monthKey(s.date) === m), x => x.value) / 100000
    );

    const growth = sales.map((v,i)=> i===0 ? 0 : ((v - sales[i-1])/(sales[i-1]||1))*100);
    
    const cumulative = [];
    sales.reduce((acc, val, i) => cumulative[i] = acc + val, 0);

    const barColors = growth.map(g => g>0 ? "#4caf50" : g<0 ? "#f44336" : "#1a237e");

    return { labels, months, sales, growth, cumulative, barColors };
}


// ===== 5. MONTHLY PO SERIES =====
function prepareMonthlyPOSeries(orderBook) {
    const months = ["2025-07","2025-08","2025-09","2025-10","2025-11","2025-12","2026-01"];
    const labels = ["October 2025","November 2025","December 2025","January 2026","February 2026","March 2026","April 2026"];

    const poCount = months.map(m => orderBook.filter(o => monthKey(o.date) === m).length);

    const poValue = months.map(m =>
        sumBy(orderBook.filter(o => monthKey(o.date) === m), x => x.value) / 100000
    );

    const growth = poValue.map((v,i)=> i===0 ? 0 : ((v-poValue[i-1])/(poValue[i-1]||1))*100);

    return { labels, months, poCount, poValue, growth };
}


// ===== 6. PRODUCT DISTRIBUTION =====
// ===== COMPLETE vs INCOMPLETE — VALUE + COUNT =====
function prepareCompletionPieData(orderBook) {
    let completeValue = 0;
    let incompleteValue = 0;

    let completeCount = 0;
    let incompleteCount = 0;

    orderBook.forEach(o => {
        const status = (o.status || "").toLowerCase();
        const val = o.value || 0;

        if (status === "complete") {
            completeValue += val;
            completeCount++;
        }

        if (status === "incomplete") {
            incompleteValue += val;
            incompleteCount++;
        }
    });

    return {
        labels: ["Complete", "Incomplete"],
        values: [
            completeValue / 100000,     // convert to lakh
            incompleteValue / 100000
        ],
        counts: [
            completeCount,
            incompleteCount
        ]
    };
}



// ===== 7. COMPLETION =====
function prepareCompletionChartData(kpi, pendingDispatchInLakh) {
    return {
        labels: ["Total PO Value", "Complete Value", "Pending Value"],
        values: [kpi.totalPOValue, kpi.completeValue, pendingDispatchInLakh]
    };
}


// ===== 8. TOP SKUs =====
function prepareTopSKUs(orderBook, topN = 8) {
    const jobDispatchMap = {};

    orderBook.forEach(o => {
        if (!o.jobName) return;
        const qtyOrder = Number(o.orderQty) || 0;
        const qtyDisp  = Number(o.dispQty)  || 0;

        if (!jobDispatchMap[o.jobName]) {
            jobDispatchMap[o.jobName] = {
                jobName: o.jobName,
                brand: o.brand,
                totalOrder: 0,
                totalDispatch: 0,
                poSet: new Set()
            };
        }

        const item = jobDispatchMap[o.jobName];
        item.totalOrder += qtyOrder;
        item.totalDispatch += qtyDisp;
        item.poSet.add(o.poNumber);
    });

    const arr = Object.values(jobDispatchMap).map(x=>({
        jobName: x.jobName,
        brand: x.brand,
        totalOrder: x.totalOrder,
        totalDispatch: x.totalDispatch,
        poCount: x.poSet.size
    }));

    arr.sort((a,b)=>b.totalDispatch-a.totalDispatch);

    const top = arr.slice(0, topN);
    const totalDispatchQty = arr.reduce((s, x)=>s + x.totalDispatch,0);

    return { top, totalDispatchQty };
}
