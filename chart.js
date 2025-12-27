const monthlySalesChartConfig = {
    type: "bar",
    data: prepareMonthlySalesBarChart(data),
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true },
            tooltip: {
                callbacks: {
                    label: ctx =>
                        `₹ ${ctx.raw.toFixed(2)} Lakhs`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Sales Value (₹ Lakhs)"
                }
            },
            x: {
                title: {
                    display: true,
                    text: "Month"
                }
            }
        }
    }
};

    return monthlySalesChartConfig;