/* ----------------------
   COMMON FETCH HELPER
-----------------------*/
async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Network error " + r.status);
    return r.json();
}

/* -------------------------------------------
   DETAILS PAGE LOGIC + TECHNICAL INDICATORS
--------------------------------------------*/
let HISTORY_DATA = [];
let PAGE_SIZE = 50;
let currentPage = 1;
let priceChart = null;

function isDetailsPage() { return typeof SYMBOL !== "undefined"; }

async function loadHistory() {
    const url = `/api/coins/${SYMBOL}?limit=10000`;  // request all history
    HISTORY_DATA = await fetchJSON(url);

    HISTORY_DATA.sort((a,b)=>new Date(b.date) - new Date(a.date));
    renderPaginated();
    renderChart(HISTORY_DATA);
    renderIndicators(HISTORY_DATA);
}


function renderPaginated() {
    const tbody = document.getElementById("history-body");
    let start = (currentPage - 1) * PAGE_SIZE;
    let end = start + PAGE_SIZE;
    let view = HISTORY_DATA.slice(start, end);
    tbody.innerHTML = "";

    view.forEach(r => {
        const up = r.close >= r.open;
        const color = up ? "text-green-500" : "text-red-500";
        tbody.innerHTML += `
            <tr class="border-b border-white/10">
                <td class="p-3">${r.date}</td>
                <td class="p-3 ${color}">${r.open}</td>
                <td class="p-3">${r.high}</td>
                <td class="p-3">${r.low}</td>
                <td class="p-3 ${color}">${r.close}</td>
                <td class="p-3">${r.volume}</td>
            </tr>
        `;
    });

    document.getElementById("page-indicator").textContent =
        `Page ${currentPage} / ${Math.ceil(HISTORY_DATA.length / PAGE_SIZE)}`;
}

document.getElementById("next-page")?.addEventListener("click", () => {
    if (currentPage < HISTORY_DATA.length / PAGE_SIZE) { currentPage++; renderPaginated(); }
});
document.getElementById("prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; renderPaginated(); }
});

// ------------------ PRICE CHART ------------------------
function renderChart(data) {
    const ctx = document.getElementById("price-chart");
    const labels = data.map(r => r.date).reverse();
    const close = data.map(r => r.close).reverse();

    // Compute signals
    const rsi = RSI(close);
    const bb = BollingerBands(close,20,2);

    const signals = close.map((price,i)=>{
        if(i<1) return null;
        const sRsi = rsi[i]>70?"Sell":rsi[i]<30?"Buy":null;
        const sBB = price>bb.upper[i]?"Sell":price<bb.lower[i]?"Buy":null;

        if(sRsi==="Sell"||sBB==="Sell") return {type:"Sell", value:price};
        if(sRsi==="Buy"||sBB==="Buy") return {type:"Buy", value:price};
        return null;
    });

    if (priceChart) priceChart.destroy();

    priceChart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: SYMBOL + " Price",
                    data: close,
                    segment: {
                        borderColor: ctx=>{
                            const i=ctx.p0DataIndex;
                            const curr=close[i];
                            const next=close[i+1];
                            if(next===undefined) return "#10b981";
                            return next>curr?"#10b981":"#ef4444";
                        }
                    },
                    borderWidth: 2,
                    tension: 0.25,
                    pointRadius: 0
                },
                {
                    label: "Signals",
                    data: close.map((v,i)=>{
                        const s = signals[i];
                        return s ? s.value : null;
                    }),
                    pointStyle: close.map((v,i)=>{
                        const s = signals[i];
                        if(!s) return null;
                        return s.type==="Buy"?"triangle":"rectRot";
                    }),
                    pointRadius: 10,
                    pointBackgroundColor: close.map((v,i)=>{
                        const s = signals[i];
                        if(!s) return null;
                        return s.type==="Buy"?"green":"red";
                    }),
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                zoom: {
                    zoom: { wheel: { enabled:true }, pinch: { enabled:true }, mode:"x" },
                    pan: { enabled:true, mode:"x" }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const signal = signals[idx];
                            if(signal) return `${signal.type} Signal: $${signal.value.toFixed(2)}`;
                            return `Price: $${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: { x:{ticks:{maxRotation:0}}, y:{beginAtZero:false} }
        }
    });
}



// ------------------ INDICATORS FUNCTIONS ------------------------

// SMA
function SMA(values, period){
    let res=[];
    for(let i=0;i<values.length;i++){
        if(i<period-1){res.push(null);continue;}
        const slice=values.slice(i-period+1,i+1);
        res.push(slice.reduce((a,b)=>a+b,0)/period);
    }
    return res;
}

// EMA
function EMA(values, period){
    let res=[];
    const k=2/(period+1);
    values.forEach((v,i)=>{ res.push(i===0?v:v*k + res[i-1]*(1-k)); });
    return res;
}

// WMA
function WMA(values, period){
    let res=[];
    const weightSum = period*(period+1)/2;
    for(let i=0;i<values.length;i++){
        if(i<period-1){res.push(null);continue;}
        let sum=0;
        for(let j=0;j<period;j++){sum+=values[i-j]*(period-j);}
        res.push(sum/weightSum);
    }
    return res;
}

// RSI
function RSI(values, period=14){
    let res=[];
    let gains=[], losses=[];
    for(let i=1;i<values.length;i++){
        const change=values[i]-values[i-1];
        gains.push(change>0?change:0);
        losses.push(change<0?-change:0);
        if(i<period){res.push(null); continue;}
        const avgGain=gains.slice(i-period,i).reduce((a,b)=>a+b,0)/period;
        const avgLoss=losses.slice(i-period,i).reduce((a,b)=>a+b,0)/period;
        const rs = avgLoss===0?100:avgGain/avgLoss;
        res.push(100-(100/(1+rs)));
    }
    res.unshift(null);
    return res;
}

// MACD
function MACD(values, fast=12, slow=26, signal=9){
    const emaFast=EMA(values,fast);
    const emaSlow=EMA(values,slow);
    const macdLine=emaFast.map((v,i)=>v-emaSlow[i]);
    const signalLine=EMA(macdLine.slice(slow-1),signal);
    const fullSignal=Array(slow-1).fill(null).concat(signalLine);
    const histogram=macdLine.map((v,i)=>v-(fullSignal[i]||0));
    return {macdLine, signalLine: fullSignal, histogram};
}

// Stochastic
function Stochastic(values,kPeriod=14,dPeriod=3){
    let kLine=[];
    for(let i=0;i<values.length;i++){
        if(i<kPeriod-1){kLine.push(null);continue;}
        const slice=values.slice(i-kPeriod+1,i+1);
        const high=Math.max(...slice), low=Math.min(...slice);
        kLine.push(((values[i]-low)/(high-low))*100);
    }
    let dLine=[];
    for(let i=0;i<kLine.length;i++){
        if(i<dPeriod-1||kLine[i]===null){dLine.push(null);continue;}
        const slice=kLine.slice(i-dPeriod+1,i+1);
        dLine.push(slice.reduce((a,b)=>a+b,0)/dPeriod);
    }
    return {kLine,dLine};
}

// Bollinger Bands
function BollingerBands(values, period=20,stdMult=2){
    let middle=SMA(values,period), upper=[], lower=[];
    for(let i=0;i<values.length;i++){
        if(i<period-1){upper.push(null);lower.push(null);continue;}
        const slice=values.slice(i-period+1,i+1);
        const mean=middle[i];
        const std=Math.sqrt(slice.reduce((a,b)=>a+(b-mean)**2,0)/period);
        upper.push(mean+std*stdMult);
        lower.push(mean-std*stdMult);
    }
    return {upper,middle,lower};
}

// Volume MA
function VolumeMA(volumes,period=20){ return SMA(volumes,period); }

function CCI(values, period = 20) {
    let res = [];
    for (let i = 0; i < values.length; i++) {
        if (i < period - 1) { res.push(null); continue; }
        let slice = values.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a,b)=>a+b,0)/period;
        const meanDev = slice.reduce((a,b)=>a+Math.abs(b-mean),0)/period;
        res.push((values[i]-mean)/(0.015*meanDev));
    }
    return res;
}

function ADX(highs, lows, closes, period = 14){
    let plusDM=[], minusDM=[], TR=[], adx=[];

    for(let i=1;i<highs.length;i++){
        let up = highs[i]-highs[i-1];
        let down = lows[i-1]-lows[i];
        plusDM.push(up>down&&up>0?up:0);
        minusDM.push(down>up&&down>0?down:0);
        TR.push(Math.max(highs[i]-lows[i], Math.abs(highs[i]-closes[i-1]), Math.abs(lows[i]-closes[i-1])));
    }

    function EMAArray(arr,p){
        let res=[]; const k=2/(p+1);
        arr.forEach((v,i)=>res.push(i===0?v:v*k + res[i-1]*(1-k)));
        return res;
    }

    const smPlus=EMAArray(plusDM, period);
    const smMinus=EMAArray(minusDM, period);
    const DX = smPlus.map((p,i)=>smMinus[i]+smPlus[i]===0?0:100*Math.abs(p-smMinus[i])/(p+smMinus[i]));
    adx.push(...Array(period).fill(null)); // first 'period' points
    adx.push(...EMAArray(DX.slice(period), period)); // rest

    return adx;
}



// ------------------ RENDER INDICATORS ------------------------
const INDICATOR_CHARTS = {};

function renderIndicators(data){
    const closes = data.map(r => r.close);
    const highs = data.map(r => r.high);
    const lows = data.map(r => r.low);
    const volumes = data.map(r => r.volume);
    const labels = data.map(r => r.date);

    const dynamicPeriod = Math.min(20, closes.length); 

    function safeNewChart(id, config) {
        if (INDICATOR_CHARTS[id]) INDICATOR_CHARTS[id].destroy();
        config.options.plugins = config.options.plugins || {};
        config.options.plugins.zoom = {
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
            pan: { enabled: true, mode: 'x' }
        };
        INDICATOR_CHARTS[id] = new Chart(document.getElementById(id), config);
    }

    // RSI
    safeNewChart("rsi-chart", {
        type: "line",
        data: { labels, datasets: [{label: "RSI", data: RSI(closes, dynamicPeriod), borderColor: "#f59e0b", pointRadius: 0}] },
        options: { plugins:{legend:{display:true}}, scales:{y:{min:0,max:100}} }
    });

    // MACD
    const macd = MACD(closes, Math.floor(dynamicPeriod/2), dynamicPeriod, Math.floor(dynamicPeriod/3));
    safeNewChart("macd-chart", {
        type: "line",
        data: { labels, datasets:[
            {label:"MACD Line", data: macd.macdLine, borderColor:"#10b981", pointRadius:0},
            {label:"Signal Line", data: macd.signalLine, borderColor:"#ef4444", pointRadius:0}
        ]},
        options:{plugins:{legend:{display:true}}}
    });

    // Stochastic
    const stoch = Stochastic(closes, dynamicPeriod, Math.floor(dynamicPeriod/3));
    safeNewChart("stoch-chart", {
        type: "line",
        data:{ labels, datasets:[
            {label:"%K", data: stoch.kLine, borderColor:"#3b82f6", pointRadius:0},
            {label:"%D", data: stoch.dLine, borderColor:"#f43f5e", pointRadius:0}
        ]},
        options:{plugins:{legend:{display:true}}, scales:{y:{min:0,max:100}}}
    });

    // ADX
    const adxData = ADX(highs, lows, closes, dynamicPeriod);
    safeNewChart("adx-chart", { type:"line", data:{labels,datasets:[{label:"ADX",data:adxData,borderColor:"#8b5cf6",pointRadius:0}]}, options:{plugins:{legend:{display:true}}, scales:{y:{beginAtZero:true}}} });

    // CCI
    const cciData = CCI(closes, dynamicPeriod);
    safeNewChart("cci-chart", { type:"line", data:{labels,datasets:[{label:"CCI",data:cciData,borderColor:"#ec4899",pointRadius:0}]}, options:{plugins:{legend:{display:true}}} });

    // Moving averages
    safeNewChart("sma-chart", { type:"line", data:{labels,datasets:[{label:`SMA${dynamicPeriod}`, data:SMA(closes,dynamicPeriod), borderColor:"#8b5cf6", pointRadius:0}]}, options:{plugins:{legend:{display:true}}} });
    safeNewChart("ema-chart", { type:"line", data:{labels,datasets:[{label:`EMA${dynamicPeriod}`, data:EMA(closes,dynamicPeriod), borderColor:"#f59e0b", pointRadius:0}]}, options:{plugins:{legend:{display:true}}} });
    safeNewChart("wma-chart", { type:"line", data:{labels,datasets:[{label:`WMA${dynamicPeriod}`, data:WMA(closes,dynamicPeriod), borderColor:"#10b981", pointRadius:0}]}, options:{plugins:{legend:{display:true}}} });

    const bb = BollingerBands(closes,dynamicPeriod,2);
    safeNewChart("bb-chart", { type:"line", data:{labels,datasets:[
        {label:"Upper", data: bb.upper, borderColor:"#ef4444", pointRadius:0},
        {label:"Middle", data: bb.middle, borderColor:"#3b82f6", pointRadius:0},
        {label:"Lower", data: bb.lower, borderColor:"#10b981", pointRadius:0}
    ]}, options:{plugins:{legend:{display:true}}} });

    safeNewChart("volume-ma-chart", { type:"line", data:{labels,datasets:[
        {label:"Volume", data: volumes, borderColor:"#6b7280", pointRadius:0},
        {label:`Volume MA${dynamicPeriod}`, data: VolumeMA(volumes,dynamicPeriod), borderColor:"#3b82f6", pointRadius:0}
    ]}, options:{plugins:{legend:{display:true}}} });
}


// ------------------ TIMEFRAME ------------------------
let currentTimeframe = "1d"; 

document.getElementById("tf-1d").addEventListener("click", ()=>setTimeframe("1d"));
document.getElementById("tf-1w").addEventListener("click", ()=>setTimeframe("1w"));
document.getElementById("tf-1m").addEventListener("click", ()=>setTimeframe("1m"));

function setTimeframe(tf){
    currentTimeframe = tf;
    ["tf-1d","tf-1w","tf-1m"].forEach(id=>{
        const btn=document.getElementById(id);
        btn.classList.remove("bg-indigo-600","text-white");
        btn.classList.add("bg-gray-200","text-gray-800");
    });
    document.getElementById("tf-"+tf).classList.add("bg-indigo-600","text-white");

    renderTimeframe();
}

function renderTimeframe(){
    let data;
    if(currentTimeframe==="1d") data = HISTORY_DATA.slice(-30);
    else if(currentTimeframe==="1w") data = HISTORY_DATA.slice(-90);
    else if(currentTimeframe==="1m") data = HISTORY_DATA.slice(-365);

    renderChart(data);
    renderIndicators(data);
    renderSignalTable(data);
}

// ------------------ SIGNAL TABLE ------------------------
function renderSignalTable(data){
    const closes = data.map(r=>r.close);
    const highs = data.map(r=>r.high);
    const lows = data.map(r=>r.low);
    const volumes = data.map(r=>r.volume);

    const lastClose = closes[closes.length-1];

    // Compute indicators
    const rsi = RSI(closes).filter(v=>v!==null).slice(-1)[0];
    const macd = MACD(closes);
    const macdLast = macd.macdLine.slice(-1)[0];
    const macdSignalLast = macd.signalLine.slice(-1)[0];
    const stoch = Stochastic(closes);
    const stochLast = stoch.kLine.slice(-1)[0];
    const adxLast = ADX(highs,lows,closes).slice(-1)[0];
    const cciLast = CCI(closes).slice(-1)[0];
    const smaLast = SMA(closes,20).slice(-1)[0];
    const emaLast = EMA(closes,20).slice(-1)[0];
    const wmaLast = WMA(closes,20).slice(-1)[0];
    const bb = BollingerBands(closes,20,2);
    const upperBB = bb.upper.slice(-1)[0];
    const lowerBB = bb.lower.slice(-1)[0];

    // Signals functions
    function signalRsi(v){ return v>70?"Sell":v<30?"Buy":"Hold"; }
    function signalMacd(m,s){ return m>s?"Buy":m<s?"Sell":"Hold"; }
    function signalStoch(v){ return v>80?"Sell":v<20?"Buy":"Hold"; }
    function signalAdx(v){ return v>25?"Strong Trend":"Weak Trend"; }
    function signalCci(v){ return v>100?"Sell":v<-100?"Buy":"Hold"; }
    function signalMA(last,prev){ return last>prev?"Buy":last<prev?"Sell":"Hold"; }
    function signalBB(price,u,l){ return price>u?"Sell":price<l?"Buy":"Hold"; }

    const rows = [
        {indicator:"RSI", value:rsi.toFixed(2), signal:signalRsi(rsi)},
        {indicator:"MACD", value:macdLast.toFixed(2), signal:signalMacd(macdLast,macdSignalLast)},
        {indicator:"Stochastic %K", value:stochLast.toFixed(2), signal:signalStoch(stochLast)},
        {indicator:"ADX", value:adxLast.toFixed(2), signal:signalAdx(adxLast)},
        {indicator:"CCI", value:cciLast.toFixed(2), signal:signalCci(cciLast)},
        {indicator:"SMA20", value:smaLast.toFixed(2), signal:signalMA(smaLast,SMA(closes,20).slice(-2,-1)[0])},
        {indicator:"EMA20", value:emaLast.toFixed(2), signal:signalMA(emaLast,EMA(closes,20).slice(-2,-1)[0])},
        {indicator:"WMA20", value:wmaLast.toFixed(2), signal:signalMA(wmaLast,WMA(closes,20).slice(-2,-1)[0])},
        {indicator:"Bollinger Bands", value:`${lowerBB.toFixed(2)} - ${upperBB.toFixed(2)}`, signal:signalBB(lastClose,upperBB,lowerBB)},
        {indicator:"Volume MA20", value:VolumeMA(volumes,20).slice(-1)[0].toFixed(2), signal:"Check Volume"}
    ];

    const tbody = document.getElementById("signals-body");
    tbody.innerHTML = "";
    rows.forEach(r=>{
        tbody.innerHTML += `<tr class="border-b border-white/10">
            <td class="p-3">${r.indicator}</td>
            <td class="p-3">${r.value}</td>
            <td class="p-3 font-bold">${r.signal}</td>
        </tr>`;
    });
}

// ------------------ LOAD LSTM PREDICTION ------------------------
async function loadLSTM() {
    try {
        const data = await fetchJSON(`/api/lstm/${SYMBOL}`);
        const mse = data.rmse ** 2;

        document.getElementById("lstm-loading").classList.add("hidden");
        document.getElementById("lstm-result").classList.remove("hidden");

        document.getElementById("lstm-price").textContent =
            `$${data.predicted_price.toFixed(2)}`;

        document.getElementById("lstm-mse").textContent = mse.toFixed(2);

        document.getElementById("lstm-rmse").textContent =
            data.rmse.toFixed(2);

        document.getElementById("lstm-mape").textContent =
            data.mape.toFixed(2);

        document.getElementById("lstm-r2").textContent =
            data.r2.toFixed(3);

    } catch (e) {
        document.getElementById("lstm-loading").textContent =
            "LSTM data not available";
        console.error(e);
    }
}


function getWatchlist() {
    try {
        const r = localStorage.getItem('watchlist_v1');
        return r ? JSON.parse(r) : [];
    } catch(e) { return []; }
}

function saveWatchlist(list) {
    localStorage.setItem('watchlist_v1', JSON.stringify(list));
}

async function toggleWatchlist(symbol) {
    const list = new Set(getWatchlist());
    if (list.has(symbol)) {
        list.delete(symbol);
        try { await fetch(`/api/watchlist/remove/${symbol}`, { method: "POST" }); } catch(e) {}
    } else {
        list.add(symbol);
        try { await fetch(`/api/watchlist/add/${symbol}`, { method: "POST" }); } catch(e) {}
    }
    saveWatchlist(Array.from(list));
    updateDetailsPrice(); 
}

function updateDetailsPrice() {
    if(HISTORY_DATA.length === 0) return;

    const sorted = [...HISTORY_DATA].sort((a, b) => new Date(b.date) - new Date(a.date));
    const last = sorted[0];
    const prev = sorted[1] || last;

    const priceEl = document.getElementById("details-price");
    const changeEl = document.getElementById("details-change");
    const watchBtn = document.getElementById("details-watch-btn");
    if (!watchBtn) return;

    // Current price (latest close)
    priceEl.textContent = "$" + last.close.toFixed(2);

    // Price change
    const diff = last.close - prev.close;
    const pct = prev.close === 0 ? 0 : (diff / prev.close) * 100;
    changeEl.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2) + " (" + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%)";
    changeEl.className = diff >= 0 ? "text-green-500 text-xl font-semibold" : "text-red-500 text-xl font-semibold";

    // Watchlist button text
    watchBtn.textContent = getWatchlist().includes(SYMBOL) ? "Remove" : "Watch";

    // Remove previous click listeners and add a single listener
    watchBtn.onclick = () => toggleWatchlist(SYMBOL);
}


// ------------------ INITIALIZE ------------------------
document.addEventListener("DOMContentLoaded", async ()=>{
    if(isDetailsPage()) {
        await loadHistory();
        renderTimeframe();
        await loadLSTM()
        updateDetailsPrice()
    }
});

