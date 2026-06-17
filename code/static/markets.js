let FULL_MARKET_DATA = [];
let currentSort = localStorage.getItem("sortColumn") || "symbol";
let currentDirection = localStorage.getItem("sortDirection") || "desc";
let searchQuery = "";

/* ---------------- UTIL ---------------- */
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Network error");
  return r.json();
}

function formatMoney(v) {
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function smartValue(v) {
  if (v == null) return -Infinity;
  return isNaN(v) ? v.toString().toLowerCase() : Number(v);
}

/* ---------------- WATCHLIST ---------------- */
function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("watchlist_v1")) || [];
  } catch { return []; }
}

function saveWatchlist(arr) {
  localStorage.setItem("watchlist_v1", JSON.stringify(arr));
}

function toggleWatch(sym) {
  const s = new Set(getWatchlist());
  s.has(sym) ? s.delete(sym) : s.add(sym);
  saveWatchlist([...s]);
  renderMarkets();
  renderWatchlistPanel();
}

function removeFromWatchlist(sym) {
  const s = new Set(getWatchlist());
  s.delete(sym);
  saveWatchlist([...s]);
  renderMarkets();
  renderWatchlistPanel();
}

/* ---------------- LOGOS ---------------- */
function getLogo(sym) {
  return `/static/logos/${sym.toUpperCase()}.png`;
}

function fallbackLogo(img, sym, size = 64) {
  img.onerror = null;
  img.src = `https://img.logo.dev/crypto/${sym.toLowerCase()}?size=${size}&token=pk_NrR3Qhs_TPCRWLsd2b1Plg`;
}

/* ---------------- SPARKLINE ---------------- */
function drawSparkline(canvas, data) {
  if (!data.length) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  const min = Math.min(...data);
  const max = Math.max(...data);

  ctx.beginPath();
  ctx.strokeStyle = "#4ade80";
  data.forEach((v,i)=>{
    const x = (i/(data.length-1))*w;
    const y = h - ((v-min)/(max-min||1))*h;
    i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
  });
  ctx.stroke();
}

async function loadSparkline(canvas, sym) {
  try {
    const d = await fetchJSON(`/api/coins/${sym}?limit=30`);
    drawSparkline(canvas, d.map(x=>Number(x.close)));
  } catch {}
}

const sparkObserver = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      loadSparkline(e.target, e.target.dataset.symbol);
      sparkObserver.unobserve(e.target);
    }
  });
},{rootMargin:"100px"});

/* ---------------- RENDER ---------------- */
function renderMarkets() {
  const grid = document.getElementById("markets-grid");
  grid.innerHTML = "";

  let data = FULL_MARKET_DATA.filter(c =>
    !searchQuery ||
    c.symbol.toLowerCase().includes(searchQuery) ||
    c.name?.toLowerCase().includes(searchQuery)
  );

  data.sort((a,b)=>{
    const A = smartValue(a[currentSort]);
    const B = smartValue(b[currentSort]);
    return currentDirection==="asc" ? A>B?1:-1 : A<B?1:-1;
  });

  data.forEach(c=>{
    const pct = c.open ? ((c.close-c.open)/c.open)*100 : 0;
    const watched = getWatchlist().includes(c.symbol);

    const card = document.createElement("div");
    card.className = "rounded-2xl p-5 shadow-lg bg-white dark:bg-gray-800 border";

    card.innerHTML = `
      <div class="flex justify-between">
        <div class="flex gap-3">
          <img src="${getLogo(c.symbol)}"
               onerror="fallbackLogo(this,'${c.symbol}',64)"
               class="w-10 h-10 rounded-full border bg-white">
          <div>
            <div class="font-bold text-lg">${c.symbol}</div>
            <div class="text-sm opacity-70">${c.date || "-"}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold">$${formatMoney(c.close)}</div>
          <div class="${pct>=0?'price-positive':'price-negative'} text-sm">
            ${pct>=0?'+':''}${pct.toFixed(2)}%
          </div>
        </div>
      </div>

      <canvas class="sparkline w-full h-14 mt-3"
              width="300" height="56"
              data-symbol="${c.symbol}"></canvas>

      <div class="flex justify-between mt-3 text-sm">
        <div class="flex gap-2">
          <a href="/details/${c.symbol}"
             class="px-3 py-1.5 border rounded-lg">Details</a>
          <a
            class="px-3 py-1.5 rounded-lg border text-sm hover:bg-white/10 transition"
            href="/on-chain/${c.symbol}">
            Analysis
          </a>
          <button onclick="toggleWatch('${c.symbol}')"
             class="px-3 py-1.5 border rounded-lg
             ${watched?'bg-red-500 text-white':''}">
             ${watched?'Remove':'Watch'}
          </button>
        </div>
        <div class="opacity-70">Vol: ${Number(c.volume||0).toLocaleString()}</div>
      </div>
    `;

    grid.appendChild(card);
    sparkObserver.observe(card.querySelector(".sparkline"));
  });
}

/* ---------------- WATCHLIST PANEL ---------------- */
function renderWatchlistPanel() {
  const wrap = document.getElementById("markets-watchlist");
  const empty = document.getElementById("markets-watchlist-empty");
  if (!wrap) return;

  const stored = getWatchlist();
  wrap.innerHTML = "";

  if (!stored || stored.length === 0) {
    empty?.classList.remove("hidden");
    return;
  }
  empty?.classList.add("hidden");

  const map = new Map(FULL_MARKET_DATA.map(c => [c.symbol, c]));

  stored.forEach(symbol => {
    const coin = map.get(symbol);
    if (!coin) return;

    const logo = getLogo(symbol);
    const price = coin.close != null ? Number(coin.close) : null;

    const pct =
      coin.open && coin.close
        ? ((coin.close - coin.open) / coin.open) * 100
        : null;

    const vol = coin.volume != null ? Number(coin.volume) : null;

    const pctClass =
      pct == null ? "" :
      pct >= 0 ? "text-green-500" : "text-red-500";

    const pctText =
      pct == null ? "-" :
      (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";

    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700";

    div.innerHTML = `
      <div class="flex items-center gap-3">

        <img src="${logo}"
             onerror="fallbackLogo(this, '${symbol}', 32)"
             loading="lazy"
             class="w-7 h-7 rounded-full border bg-white object-contain" />

        <div>
          <div class="font-semibold text-sm">${symbol}</div>
          <div class="text-xs opacity-70">
            $${price != null ? formatMoney(price) : '-'} |
            <span class="${pctClass}">${pctText}</span>
          </div>
          <div class="text-xs opacity-60">
            Vol: ${vol != null ? vol.toLocaleString() : '-'}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <a href="/details/${symbol}"
           class="px-3 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition">
           Details
        </a>

        <button
          data-sym="${symbol}"
          class="remove-watch px-3 py-1 rounded-lg bg-red-500 text-white text-xs shadow hover:bg-red-600 transition">
          Remove
        </button>
      </div>
    `;

    wrap.appendChild(div);
  });

  wrap.querySelectorAll(".remove-watch").forEach(btn => {
    btn.addEventListener("click", e => {
      removeFromWatchlist(e.target.dataset.sym);
    });
  });
}

function clearWatchlist() {
  localStorage.removeItem("watchlist_v1");
  renderMarkets();
  renderWatchlistPanel();
}

document.getElementById("clear-watchlist")?.addEventListener("click", clearWatchlist);


/* ---------------- INIT ---------------- */
document.getElementById("market-search").addEventListener("input", e=>{
  searchQuery = e.target.value.toLowerCase();
  renderMarkets();
});

document.getElementById("sort-column").addEventListener("change", e=>{
  currentSort = e.target.value;
  renderMarkets();
});

document.getElementById("sort-direction").addEventListener("click", ()=>{
  currentDirection = currentDirection==="asc"?"desc":"asc";
  document.getElementById("sort-emoji").textContent =
    currentDirection==="asc"?"⬆️":"⬇️";
  renderMarkets();
});

(async ()=>{
FULL_MARKET_DATA = await fetchJSON("/api/coins");
  renderMarkets();
  renderWatchlistPanel();
})();
