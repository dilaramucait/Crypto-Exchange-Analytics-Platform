// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    loadPriceHistory();
    loadOnChainData();
    loadSentiment();
    loadNews();
    loadCombinedSignal();
});


function mapWithDates(series, dates) {
    return dates.map((date, i) => ({
        date,
        value: series[i] !== undefined ? series[i] : null
    }));
}


// ===============================
// PRICE HISTORY
// ===============================
let priceDates = [];

async function loadPriceHistory() {
    try {
        const res = await fetch(`/api/coins/${SYMBOL}?limit=60`);
        const data = await res.json();
        priceDates = data.map(d => d.date); // store dates for NVT/MVRV mapping

        const ctx = document.getElementById("price-chart");
        if (!ctx) return;

        new Chart(ctx, {
            type: "line",
            data: {
                labels: priceDates,
                datasets: [{
                    label: `${SYMBOL} Price`,
                    data: data.map(d => d.close),
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#22c55e",
                    borderColor: "#22c55e",
                    fill: false
                }]
            },
            options: getChartOptions("Price")
        });

    } catch (err) {
        console.error("Price history error:", err);
    }
}

// ===============================
// ON-CHAIN DATA + CHARTS
// ===============================
async function loadOnChainData() {
    try {
        const res = await fetch(`/api/onchain/${SYMBOL}`);
        const data = await res.json();
        console.log("On-chain data:", data);

        renderLineChart("active-addresses-chart", data.active_addresses, "Active Addresses");
        renderLineChart("transactions-chart", data.transactions, "Transactions");
        renderLineChart("exchange-inflow-chart", data.exchange_flows.inflow, "Exchange Inflow");
        renderLineChart("exchange-outflow-chart", data.exchange_flows.outflow, "Exchange Outflow");
        renderLineChart("whale-chart", data.whale_transactions, "Whale Transactions");
        renderLineChart("hashrate-chart", data.hash_rate, "Hash Rate");

        const nvtSeries = normalizeSeries(data.nvt, priceDates);
        const mvrvSeries = normalizeSeries(data.mvrv, priceDates);
        const tvlSeries  = normalizeSeries(data.tvl, priceDates);


        if (nvtSeries.length) renderLineChart("nvt-chart", nvtSeries, "NVT Ratio");
        if (mvrvSeries.length) renderLineChart("mvrv-chart", mvrvSeries, "MVRV");
        if (tvlSeries.length) renderLineChart("tvl-chart", tvlSeries, "TVL");

    } catch (err) {
        console.error("On-chain fetch error:", err);
    }
}
// For NVT, MVRV, TVL, etc.
function normalizeSeries(series, dates) {
    if (!series || !series.length) return []; 

    if (series[0] && series[0].date !== undefined && series[0].value !== undefined) return series;

    return dates.map((date, i) => ({
        date,
        value: series[i] !== undefined ? series[i] : null
    }));
}

// ===============================
// GENERIC LINE CHART WITH ZOOM, PAN, HOVER
// ===============================
function renderLineChart(canvasId, series, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !series) return;

    const labels = series.map(d => d.date);
    const data = series.map(d => d.value);

    new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label,
                data,
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#4f46e5",
                borderColor: "#4f46e5",
                fill: false
            }]
        },
        options: getChartOptions(label)
    });
}


// ===============================
// CHART OPTIONS FACTORY
// ===============================
function getChartOptions(yLabel) {
    return {
        responsive: true,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                mode: "nearest",
                intersect: false,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.raw}`;
                    }
                }
            },
            zoom: {
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: "xy"
                },
                pan: {
                    enabled: true,
                    mode: "xy"
                }
            }
        },
        scales: {
            x: {
                display: true,
                ticks: { color: "#9ca3af" },
                title: { display: true, text: "Date", color: "#9ca3af" }
            },
            y: {
                display: true,
                ticks: { color: "#9ca3af" },
                title: { display: true, text: yLabel, color: "#9ca3af" }
            }
        }
    };
}

// ===============================
// MARKET SENTIMENT
// ===============================
async function loadSentiment() {
    const box = document.getElementById("sentiment-box");
    try {
        const res = await fetch(`/api/sentiment/${SYMBOL}`);
        const data = await res.json();
        console.log("Sentiment data:", data);

        const color =
            data.label === "Bullish" ? "bg-green-600" :
            data.label === "Bearish" ? "bg-red-600" :
            "bg-yellow-600";

        box.className = `inline-block px-4 py-2 rounded-lg text-sm ${color}`;
        box.innerHTML = `${data.label} <span class="opacity-80">(Score: ${data.score})</span>`;
    } catch (err) {
        box.innerHTML = "Sentiment unavailable";
        console.error(err);
    }
}

// ===============================
// NEWS SENTIMENT
// ===============================
async function loadNews() {
    const box = document.getElementById("news-box");
    try {
        const res = await fetch(`/api/news/${SYMBOL}`);
        const news = await res.json();

        if (!news.length) {
            box.innerHTML = "No recent news found.";
            return;
        }

        box.innerHTML = news.map(n => `
            <div class="p-3 rounded-lg bg-slate-700">
                <div class="font-medium">${n.title}</div>
                <div class="text-sm opacity-70">${n.sentiment}</div>
            </div>
        `).join("");

    } catch (err) {
        box.innerHTML = "News unavailable";
        console.error(err);
    }
}

// ===============================
// COMBINED SIGNAL
// ===============================
async function loadCombinedSignal() {
    const box = document.getElementById("signal-box");
    try {
        const res = await fetch(`/api/combined-signal/${SYMBOL}`);
        const data = await res.json();
        console.log("Combined signal data:", data);
        const color =
            data.signal === "BUY" ? "bg-green-600" :
            data.signal === "SELL" ? "bg-red-600" :
            "bg-yellow-600";

        box.className = `text-center text-xl font-bold px-6 py-4 rounded-xl ${color}`;
        box.innerHTML = `
            ${data.signal}
            <div class="text-sm opacity-80 mt-1">
                Confidence: ${(data.confidence * 100).toFixed(0)}%
            </div>
        `;
    } catch (err) {
        box.innerHTML = "Signal unavailable";
        console.error(err);
    }
}
