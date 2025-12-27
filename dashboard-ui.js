document.addEventListener("DOMContentLoaded", function () {
    // 1. Financial overview
    const financial = calculateFinancialOverview(salesBookData);
    const pendingDispatchInLakh = calculatePendingDispatch(orderBookData);
    const kpi = calculateKPIs(orderBookData, salesBookData);

    document.getElementById("total-invoice").textContent = financial.totalInvoiceNumber;
    document.getElementById("outstanding-amount").textContent = `${financial.outstandingAmountInLakh.toFixed(2)} L`;
    document.getElementById("pending-dispatch").textContent = `${pendingDispatchInLakh.toFixed(2)} L`;

    document.getElementById("ytd-sale").textContent = kpi.ytdSales.toFixed(2);
    document.getElementById("avg-monthly-sale").textContent = kpi.avgMonthlySale.toFixed(2);
    document.getElementById("total-po").textContent = kpi.uniquePOs;
    document.getElementById("current-month-sale").textContent = kpi.currentMonthSales.toFixed(2);
    document.getElementById("total-sku").textContent = kpi.totalSKU;
    document.getElementById("completion-rate").textContent = kpi.completionRate.toFixed(1);

    // 2. Sales chart
    const salesSeries = prepareMonthlySalesSeries(salesBookData);
    const salesCtx = document.getElementById("monthlySalesChart").getContext("2d");

    new Chart(salesCtx, {
        type: "line",
        data: {
            labels: salesSeries.labels,
            datasets: [
                {
                    label: "Sales in lakh",
                    data: salesSeries.monthValues,
                    backgroundColor: "rgba(26,35,126,0.1)",
                    borderColor: "#1a237e",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: "y"
                },
                {
                    label: "Growth",
                    data: salesSeries.growthPercentage,
                    borderColor: "#4caf50",
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: "y1",
                    pointStyle: "circle",
                    pointRadius: 5,
                    pointBackgroundColor: "#4caf50"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.datasetIndex === 0) {
                                return `Sales ${context.raw.toFixed(2)} lakh`;
                            } else {
                                return `Growth ${context.raw.toFixed(1)}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "Sales in lakh" },
                    ticks: { callback: value => value.toFixed(1) }
                },
                y1: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "Growth %" },
                    ticks: { callback: value => value },
                    grid: { drawOnChartArea: false }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // 3. PO chart
    const poSeries = prepareMonthlyPOData(orderBookData);
    const poCtx = document.getElementById("monthlyPOChart").getContext("2d");
    new Chart(poCtx, {
        type: "bar",
        data: {
            labels: poSeries.labels,
            datasets: [
                {
                    label: "No. of POs",
                    data: poSeries.poDataByMonth.map(x => x.count),
                    backgroundColor: "#283593",
                    borderColor: "#1a237e",
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: "y"
                },
                {
                    label: "PO Value in lakh",
                    data: poSeries.poDataByMonth.map(x => x.value),
                    backgroundColor: "#5c6bc0",
                    borderColor: "#283593",
                    borderWidth: 1,
                    borderRadius: 6,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.datasetIndex === 0) {
                                return `POs ${context.raw}`;
                            } else {
                                return `Value ${context.raw.toFixed(2)} lakh`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: "linear",
                    position: "left",
                    title: { display: true, text: "No. of Purchase Orders" },
                    ticks: { stepSize: 1 }
                },
                y1: {
                    type: "linear",
                    position: "right",
                    title: { display: true, text: "PO Value in lakh" },
                    ticks: { callback: value => value.toFixed(1) },
                    grid: { drawOnChartArea: false }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // 4. Product sales pie
    const productSales = prepareProductSalesData(orderBookData, typeof productData !== "undefined" ? productData : null);
    const prodCtx = document.getElementById("productSalesChart").getContext("2d");
    new Chart(prodCtx, {
        type: "pie",
        data: {
            labels: productSales.labels,
            datasets: [{
                data: productSales.values,
                backgroundColor: ["#1a237e", "#283593", "#5c6bc0", "#9fa8da"],
                borderWidth: 1,
                borderColor: "#fff"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { padding: 20, usePointStyle: true, pointStyle: "circle" }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total ? Math.round((value / total) * 100) : 0;
                            return `${label} ${value.toFixed(2)} lakh (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // 5. Completion chart
    const completionChartData = prepareCompletionChartData(kpi, pendingDispatchInLakh);
    const completionCtx = document.getElementById("orderCompletionChart").getContext("2d");
    new Chart(completionCtx, {
        type: "bar",
        data: {
            labels: completionChartData.labels,
            datasets: [{
                label: "Value in lakh",
                data: completionChartData.values,
                backgroundColor: ["#1a237e", "#4caf50", "#ff6b6b"],
                borderColor: ["#0d1452", "#388e3c", "#e53935"],
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return `Value ${context.raw.toFixed(2)} lakh`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "Value in lakh" },
                    ticks: { callback: value => value.toFixed(1) }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // 6. Top SKUs render
    const { top: topSKUs, totalDispatchQty } = prepareTopSKUs(orderBookData);
    const skusContainer = document.getElementById("skus-container");
    skusContainer.innerHTML = "";
    topSKUs.forEach((sku, idx) => {
        const card = document.createElement("div");
        card.className = "sku-card";
        const shortName = sku.jobName.length > 60 ? `${sku.jobName.substring(0, 60)}...` : sku.jobName;
        card.innerHTML = `
            <div class="sku-rank">${idx + 1}</div>
            <div class="sku-brand">${sku.brand || ""}</div>
            <div class="sku-name" title="${sku.jobName}">${shortName}</div>
            <div class="sku-details">
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${sku.totalDispatch.toLocaleString()}</div>
                    <div class="sku-detail-label">Dispatch Qty</div>
                </div>
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${sku.totalOrder.toLocaleString()}</div>
                    <div class="sku-detail-label">Order Qty</div>
                </div>
                <div class="sku-detail-item">
                    <div class="sku-detail-value">${sku.poCount}</div>
                    <div class="sku-detail-label">POs</div>
                </div>
            </div>
        `;
        skusContainer.appendChild(card);
    });

    // 7. Summary section
    const summaryItems = buildSummaryObjects(
        { ...kpi, uniquePOs: kpi.uniquePOs },
        productSales,
        poSeries,
        { top: topSKUs, totalDispatchQty },
        financial.outstandingAmountInLakh,
        pendingDispatchInLakh
    );
    const summaryGrid = document.querySelector(".summary-grid");
    summaryGrid.innerHTML = "";
    summaryItems.forEach(item => {
        const div = document.createElement("div");
        div.className = "summary-item";
        if (item.type === "warning") div.classList.add("warning");
        if (item.type === "alert") div.classList.add("alert");
        if (item.type === "success") div.classList.add("success");
        div.innerHTML = `
            <h4>${item.title}</h4>
            <p>${item.text}</p>
        `;
        summaryGrid.appendChild(div);
    });
});
