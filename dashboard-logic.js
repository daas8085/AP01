// Utility
function sumBy(arr, selector) {
    return arr.reduce((s, x) => s + (selector(x) || 0), 0);
}

function groupByMonthFromDateString(dateStr) {
    // expects "YYYY-MM-DD" and returns "YYYY-MM"
    return dateStr ? dateStr.slice(0, 7) : "";
}

// 1. Financial KPIs
function calculateFinancialOverview(salesBook, todayStr = "2025-12-20") {
    const uniqueInvoices = new Set(salesBook.map(x => x.invoiceNo)).size;

    const today = new Date(todayStr);
    let outstandingAmount = 0;
    salesBook.forEach(inv => {
        const due = new Date(inv.dueDate);
        if (due <= today) {
            outstandingAmount += (inv.value || 0);
        }
    });
    const outstandingAmountInLakh = outstandingAmount / 100000;

    return {
        totalInvoiceNumber: uniqueInvoices,
        outstandingAmountInLakh: outstandingAmountInLakh
    };
}

// 2. Pending for dispatch (incomplete order value)
function calculatePendingDispatch(orderBook) {
    const pendingValue = orderBook
        .filter(o => (o.status || "").toLowerCase() === "incomplete")
        .reduce((s, o) => s + (o.value || 0), 0);
    return pendingValue / 100000;
}

// 3. KPIs
function calculateKPIs(orderBook, salesBook) {
    const ytdSales = sumBy(salesBook, x => x.value) / 100000;

    // assume data only for Oct–Dec; divide by distinct months present
    const monthsSet = new Set(salesBook.map(x => groupByMonthFromDateString(x.date)).filter(Boolean));
    const monthCount = monthsSet.size || 1;
    const avgMonthlySale = ytdSales / monthCount;

    const uniquePOs = new Set(orderBook.map(x => x.poNumber)).size;

    const currentMonthPrefix = "2025-12";
    const currentMonthSales = sumBy(
        salesBook.filter(x => (x.date || "").startsWith(currentMonthPrefix)),
        x => x.value
    ) / 100000;

    const totalSKU = new Set(orderBook.map(x => x.jobName)).size;

    const totalPOValue = sumBy(orderBook, x => x.value);
    const completeValue = sumBy(orderBook.filter(o => (o.status || "").toLowerCase() === "complete"), x => x.value);
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

// 4. Monthly sales trend
function prepareMonthlySalesSeries(salesBook) {
    const months = ["2025-10", "2025-11", "2025-12"];
    const labels = ["October 2025", "November 2025", "December 2025"];

    const monthValues = months.map(m =>
        sumBy(
            salesBook.filter(s => (s.date || "").startsWith(m)),
            x => x.value
        ) / 100000
    );

    const growthPercentage = [0];
    for (let i = 1; i < monthValues.length; i++) {
        const prev = monthValues[i - 1];
        const curr = monthValues[i];
        const g = prev ? ((curr - prev) / prev) * 100 : 0;
        growthPercentage.push(g);
    }

    return { labels, monthValues, growthPercentage };
}

// 5. Monthly PO trend
function prepareMonthlyPOData(orderBook) {
    const months = ["2025-10", "2025-11", "2025-12"];
    const labels = ["October 2025", "November 2025", "December 2025"];

    const poDataByMonth = months.map(m => {
        const filtered = orderBook.filter(o => (o.loginDate || "").startsWith(m));
        const count = new Set(filtered.map(o => o.poNumber)).size;
        const value = sumBy(filtered, x => x.value) / 100000;
        return { count, value };
    });

    return { labels, poDataByMonth };
}

// 6. Product sales distribution (from productData or recalculated)
function prepareProductSalesData(orderBook, productData) {
    if (productData && productData.length) {
        const broRedObj  = productData.find(p => p.brand === "Bro Red");
        const broCodeObj = productData.find(p => p.brand === "Bro Code");
        const bongaObj   = productData.find(p => p.brand === "Bonga");
        const plainObj   = productData.find(p => p.brand === "Plain");

        return {
            labels: ["Bro Red", "Bro Code", "Bonga", "Plain"],
            values: [
                (broRedObj?.value || 0) / 100000,
                (broCodeObj?.value || 0) / 100000,
                (bongaObj?.value || 0) / 100000,
                (plainObj?.value || 0) / 100000
            ]
        };
    }

    // fallback: compute from orderBook
    const brandMap = {};
    orderBook.forEach(o => {
        const b = o.brand || "Other";
        if (!brandMap[b]) brandMap[b] = 0;
        brandMap[b] += (o.value || 0);
    });
    const labels = Object.keys(brandMap);
    const values = labels.map(b => brandMap[b] / 100000);
    return { labels, values };
}

// 7. Order completion chart values
function prepareCompletionChartData(kpi, pendingDispatchInLakh) {
    return {
        labels: ["Total PO Value", "Complete Value", "Incomplete Value"],
        values: [kpi.totalPOValue, kpi.completeValue, pendingDispatchInLakh]
    };
}

// 8. Top SKUs by dispatch
function prepareTopSKUs(orderBook, topN = 8) {
    const jobDispatchMap = {};

    orderBook.forEach(o => {
        if (!o.jobName) return;
        if (!jobDispatchMap[o.jobName]) {
            jobDispatchMap[o.jobName] = {
                jobName: o.jobName,
                brand: o.brand,
                totalDispatch: 0,
                totalOrder: 0,
                poSet: new Set(),
                status: o.status
            };
        }
        const item = jobDispatchMap[o.jobName];
        item.totalDispatch += (o.dispQty || 0);
        item.totalOrder += (o.orderQty || 0);
        item.poSet.add(o.poNumber);
    });

    const arr = Object.values(jobDispatchMap).map(x => ({
        jobName: x.jobName,
        brand: x.brand,
        totalDispatch: x.totalDispatch,
        totalOrder: x.totalOrder,
        poCount: x.poSet.size,
        status: x.status
    }));

    arr.sort((a, b) => b.totalDispatch - a.totalDispatch);

    const top = arr.slice(0, topN);
    const totalDispatchQty = arr.reduce((s, x) => s + x.totalDispatch, 0);

    return { top, totalDispatchQty };
}

// 9. Summary text objects
function buildSummaryObjects(kpi, productSales, poDataMonth, topSKUInfo, outstandingInLakh, pendingDispatchInLakh) {
    const mostActiveMonth = (() => {
        let maxIdx = 0;
        let maxCount = 0;
        poDataMonth.poDataByMonth.forEach((m, i) => {
            if (m.count > maxCount) {
                maxCount = m.count;
                maxIdx = i;
            }
        });
        return { monthLabel: poDataMonth.labels[maxIdx], poCount: maxCount };
    })();

    const topSKUName = topSKUInfo.top.length ? topSKUInfo.top[0].jobName : "N/A";

    const totalPOValuePerPO = kpi.uniquePOs ? (kpi.totalPOValue / kpi.uniquePOs) : 0;

    const broCodeIndex = productSales.labels.indexOf("Bro Code");
    const broCodeValue = broCodeIndex >= 0 ? productSales.values[broCodeIndex] : 0;

    return [
        {
            type: "normal",
            title: "Top Selling Product",
            text: `Bro Code ${broCodeValue.toFixed(2)} lakh`
        },
        {
            type: "normal",
            title: "Most Active Month",
            text: `${mostActiveMonth.monthLabel} ${mostActiveMonth.poCount} POs`
        },
        {
            type: "warning",
            title: "Completion Rate",
            text: `${kpi.completionRate.toFixed(1)}%`
        },
        {
            type: "normal",
            title: "Avg PO Value",
            text: `${totalPOValuePerPO.toFixed(2)} lakh`
        },
        {
            type: "normal",
            title: "Top SKU by Dispatch",
            text: topSKUName.length > 40 ? `${topSKUName.substring(0, 40)}...` : topSKUName
        },
        {
            type: "normal",
            title: "Total Dispatch Qty",
            text: `${topSKUInfo.totalDispatchQty.toLocaleString()} units`
        },
        {
            type: "alert",
            title: "Outstanding Amount",
            text: `${outstandingInLakh.toFixed(2)} Lakh`
        },
        {
            type: "warning",
            title: "Pending Dispatch",
            text: `${pendingDispatchInLakh.toFixed(2)} Lakh`
        }
    ];
}
