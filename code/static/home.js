// Home page logic — canvas sparklines, top10 highlight, watchlist, gainers/losers, realtime fallback

const POLL_INTERVAL = 15000;
let socket = null;
let socketConnected = false;
let ALL_COINS = [];
let DISPLAY_COINS = [];
let POLL_TIMER = null;
const tooltip = document.getElementById('spark-tooltip');

let CURRENT_SORT = "close";
let SORT_DIRECTION = "desc"; // or "asc"

function sortCoins(arr, key = CURRENT_SORT, direction = SORT_DIRECTION) {
    return arr.sort((a, b) => {
        let A, B;

        switch(key){
            case "close":
                A = Number(a.close); B = Number(b.close); break;
            case "market_cap":
                A = Number(a.market_cap); B = Number(b.market_cap); break;
            case "volume":
                A = Number(a.volume); B = Number(b.volume); break;
            case "percent_change_24h":
                A = Number(a.pct_24h || 0); B = Number(b.pct_24h || 0); break;
            case "symbol":
                A = a.symbol; B = b.symbol; break;
            default:
                return 0;
        }

        if (key === "symbol") {
            return direction === "asc"
                ? A.localeCompare(B)
                : B.localeCompare(A);
        }

        return direction === "asc"
            ? A - B
            : B - A;
    });
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error " + res.status);
  return res.json();
}

/* Watchlist helpers */
function getWatchlist(){ try{ const r=localStorage.getItem('watchlist_v1'); return r?JSON.parse(r):[] }catch(e){return[]} }
function saveWatchlist(arr){ localStorage.setItem('watchlist_v1', JSON.stringify(arr)); }
function addToWatchlist(sym){ const s=new Set(getWatchlist()); s.add(sym); saveWatchlist(Array.from(s)); renderWatchlist(); syncWatchButtons() }
function removeFromWatchlist(sym){ const s=new Set(getWatchlist()); s.delete(sym); saveWatchlist(Array.from(s)); renderWatchlist(); syncWatchButtons()}
function clearWatchlist(){ localStorage.removeItem('watchlist_v1'); renderWatchlist(); syncWatchButtons()}

/* Draw sparkline on a canvas*/
function drawSparkline(canvas, numbers){
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = devicePixelRatio || 1;
  const w = canvas.clientWidth * dpr;
  const h = canvas.clientHeight * dpr;
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0,0,w,h);
  if(!numbers || numbers.length===0) return;
  const min = Math.min(...numbers); const max = Math.max(...numbers);
  const range = (max - min) || 1;
  ctx.lineWidth = Math.max(1, 1.2 * dpr);
  ctx.beginPath();
  numbers.forEach((v,i)=>{
    const x = (i/(numbers.length-1)) * w;
    const y = h - ((v - min)/range)*h;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.strokeStyle = '#7c3aed';
  ctx.stroke();
  ctx.lineTo(w,h); ctx.lineTo(0,h); ctx.closePath();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,'rgba(124,58,237,0.12)');
  grad.addColorStop(1,'rgba(124,58,237,0.02)');
  ctx.fillStyle = grad; ctx.fill();
}

function getNearestIndex(canvas, numbers, clientX){
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (devicePixelRatio || 1);
  const w = canvas.width;
  if(numbers.length < 2) return 0;
  const idx = Math.round((x / w) * (numbers.length - 1));
  return Math.max(0, Math.min(numbers.length-1, idx));
}

/* Format */
function formatMoney(n){ if(n==null||isNaN(n)) return '-'; return Number(n).toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}); }

const LOGO_BASE = "/static/logos";
const LOGO_API_KEY = "pk_NrR3Qhs_TPCRWLsd2b1Plg";

function getLocalLogo(symbol) {
    return `${LOGO_BASE}/${symbol.toUpperCase()}.png`;
}
function logoFallback(img, symbol, size = 64) {
    img.onerror = null;
    img.src = `https://img.logo.dev/crypto/${symbol.toLowerCase()}?size=${size}&token=${LOGO_API_KEY}`;
}

/* make card element */
function makeCardElement(c, history, pct24) {
  const symbol = c.symbol.toLowerCase();
  const logo = getLocalLogo(c.symbol.toUpperCase());

  const isWatched = getWatchlist().includes(c.symbol);

  const card = document.createElement('div');
  card.className = 'crypto-card rounded-2xl p-5 shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';

  const pctClass = (pct24 != null && pct24 >= 0) ? 'price-positive' : 'price-negative';
  const pctText = pct24 == null ? '-' : (pct24 >= 0 ? '+' : '') + pct24.toFixed(2) + '%';

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-3">

        <img src="${logo}"
              onerror="logoFallback(this, '${c.symbol.toUpperCase()}', 64)"
              loading="lazy"
             class="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 bg-white object-contain" />

        <div>
          <div class="font-bold text-lg">${c.symbol}</div>
          <div class="text-sm opacity-70">Last: ${c.date || '-'}</div>
        </div>
      </div>

      <div class="text-right">
        <div class="text-2xl font-bold price-value">$${formatMoney(c.close)}</div>
        <div class="${pctClass} mt-1 inline-block text-sm">${pctText}</div>
      </div>
    </div>

    <div class="my-3">
      <canvas class="sparkline w-full h-14 rounded-md"></canvas>
    </div>

    <div class="flex items-center justify-between mt-3">
      <div class="flex items-center gap-2">
  <a
    class="px-3 py-1.5 rounded-lg border text-sm hover:bg-white/10 transition"
    href="/details/${c.symbol}">
    Details
  </a>

 <a
  class="px-3 py-1.5 rounded-lg border text-sm hover:bg-white/10 transition"
  href="/on-chain/${c.symbol}">
  Analysis
</a>


  <button
    class="px-3 py-1.5 rounded-lg border text-sm watch-toggle">
    ${isWatched ? 'Remove' : 'Watch'}
  </button>
</div>

  `;

  // === WATCHLIST ===
  const watchBtn = card.querySelector('.watch-toggle');
  watchBtn.addEventListener('click', () => {
    if (getWatchlist().includes(c.symbol)) removeFromWatchlist(c.symbol);
    else addToWatchlist(c.symbol);
    syncWatchButtons(); 
});


  // === SPARKLINE ===
  const canvas = card.querySelector('.sparkline');
  if (history && history.length) {
    const nums = history.map(r => Number(r.close));
    drawSparkline(canvas, nums);

    canvas.addEventListener('mousemove', ev => {
      const idx = getNearestIndex(canvas, nums, ev.clientX);
      const value = nums[idx];
      if (value === undefined) { tooltip.style.display = 'none'; return; }
      tooltip.style.display = 'block';
      tooltip.textContent = `$${formatMoney(value)}`;
      tooltip.style.left = (ev.clientX + 12) + 'px';
      tooltip.style.top = (ev.clientY + 12) + 'px';
    });

    canvas.addEventListener('mouseleave', () => tooltip.style.display = 'none');
  } else {
    drawSparkline(canvas, []);
  }

  return card;
}


/* render grid of coins */
async function renderGrid(limit){
  const grid = document.getElementById('home-markets-grid');
  if(!grid) return;
  grid.innerHTML = '';

  DISPLAY_COINS = ALL_COINS.slice(0, limit);

  // fetch small history for each
  const histPromises = DISPLAY_COINS.map(c => fetch(`/api/coins/${c.symbol}?limit=30`).then(r=>r.ok? r.json(): []).catch(()=>[]));
  const histories = await Promise.all(histPromises);

  const pctArr = DISPLAY_COINS.map((c,i)=>{
    const h = histories[i] || [];
    if(h.length >= 2){ const last=Number(h[h.length-1].close); const prev=Number(h[h.length-2].close); if(!isNaN(last)&&!isNaN(prev)&&prev!==0) return ((last-prev)/prev)*100; }
    return null;
  });

  DISPLAY_COINS.forEach((c, idx)=>{
    const hist = histories[idx] || [];
    const pct = pctArr[idx];
    const el = makeCardElement(c, hist, pct);
    // apply top10 class for first 10 (by market cap)
    if(idx < 10) el.classList.add('top10');
    grid.appendChild(el);
  });

  // re-draw sparklines to ensure crispness
  document.querySelectorAll('#home-markets-grid .sparkline').forEach((canvas, idx)=>{
    const hist = histories[idx] || [];
    const nums = hist.map(r=>Number(r.close));
    drawSparkline(canvas, nums);
  });

  updateQuickStats();
  renderGainersLosers();
  renderWatchlist();
}

/* quick stats */
function updateQuickStats(){
  const quick = document.getElementById('quick-stats'); if(!quick) return;
  const visible = DISPLAY_COINS;
  const avg = visible.reduce((s,c)=> s + (Number(c.close)||0),0) / Math.max(1, visible.length);
  const totalMarketCap = visible.reduce((s,c)=> s + (Number(c.market_cap)||0), 0);
  quick.innerHTML = `<p>Displayed coins: <strong>${visible.length}</strong></p>
    <p>Average price: <strong>$${formatMoney(avg)}</strong></p>
    <p>Total market cap (displayed): <strong>${totalMarketCap ? Number(totalMarketCap).toLocaleString() : '-'}</strong></p>`;
}



/* gainers / losers */
async function renderGainersLosers(){
  try{
    const all = await fetchJSON('/api/coins_with_change');
    const valid = all.filter(x => x && x.pct_24h != null && !isNaN(x.pct_24h));
    valid.sort((a,b)=> b.pct_24h - a.pct_24h);
    const gainers = valid.slice(0,5);
    const losers = valid.slice(-5).reverse();
    const gainEl = document.getElementById('gainers-list');
    const loseEl = document.getElementById('losers-list');
    gainEl.innerHTML=''; loseEl.innerHTML='';

    if(gainers.length===0) gainEl.innerHTML = "<p class='opacity-60 text-sm'>No data</p>";
    if(losers.length===0) loseEl.innerHTML = "<p class='opacity-60 text-sm'>No data</p>";

    // --- GAINERS ---
    gainers.forEach(g => {
      const logo = getLocalLogo(g.symbol.toUpperCase());

      const div = document.createElement('div');
      div.className = 'flex items-center justify-between';

      div.innerHTML = `
          <div class="flex items-center gap-2">
            <img src="${logo}"
               onerror="logoFallback(this, '${g.symbol}', 32)"
               loading="lazy"
               class="w-6 h-6 rounded-full border bg-white object-contain" />
            <div class="text-sm font-medium">${g.symbol}</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-sm ${g.pct_24h >= 0 ? 'price-positive' : 'price-negative'}">
                ${Number(g.pct_24h).toFixed(2)}%
            </div>
            <a href="/details/${g.symbol}"
               class="px-2 py-0.5 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition">
               Details
            </a>
          </div>
      `;
      gainEl.appendChild(div);
    });

    // --- LOSERS ---
    losers.forEach(g => {
      const logo = getLocalLogo(g.symbol.toUpperCase());

      const div = document.createElement('div');
      div.className = 'flex items-center justify-between';

      div.innerHTML = `
          <div class="flex items-center gap-2">
            <img src="${logo}"
                   onerror="logoFallback(this, '${g.symbol}', 32)"
                   loading="lazy"
                   class="w-6 h-6 rounded-full border bg-white object-contain" />
            <div class="text-sm font-medium">${g.symbol}</div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-sm ${g.pct_24h >= 0 ? 'price-positive' : 'price-negative'}">
                ${Number(g.pct_24h).toFixed(2)}%
            </div>
            <a href="/details/${g.symbol}"
               class="px-2 py-0.5 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition">
               Details
            </a>
          </div>
      `;
      loseEl.appendChild(div);
    });

  }catch(e){
    console.error('Gainers/losers error', e);
  }
}


/* watchlist render */
function renderWatchlist() {
    const wrap = document.getElementById('watchlist-items');
    if (!wrap) return;

    const stored = getWatchlist();
    wrap.innerHTML = '';

    if (!stored || stored.length === 0) {
        wrap.innerHTML = `<p class="opacity-60 text-sm">No coins in watchlist yet — add some from the cards.</p>`;
        return;
    }

    const map = new Map(ALL_COINS.map(c => [c.symbol, c]));

    stored.forEach(symbol => {
        const coin = map.get(symbol);
        const lower = symbol.toLowerCase();

        const logo = getLocalLogo(symbol.toUpperCase());

        const price = coin ? Number(coin.close) : null;
        const pct = coin ? Number(coin.pct_24h) : null;
        const vol = coin ? Number(coin.volume) : null;

        const pctClass =
            pct == null ? '' :
            pct >= 0 ? 'text-green-500' : 'text-red-500';

        const pctText =
            pct == null ? '-' :
            (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';

        const div = document.createElement("div");
        div.className = "flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700";

        div.innerHTML = `
            <div class="flex items-center gap-3">

                <img src="${logo}"
                     onerror="logoFallback(this, '${symbol.toUpperCase()}', 32)"
                     loading="lazy"
                     class="w-7 h-7 rounded-full border bg-white object-contain" />


                <div>
                    <div class="font-semibold text-sm">${symbol}</div>
                    <div class="text-xs opacity-70">
                        $${price != null ? formatMoney(price) : '-'} |
                        <span class="${pctClass}">${pctText}</span>
                    </div>
                    <div class="text-xs opacity-60">Vol: ${vol != null ? vol.toLocaleString() : '-'}</div>
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

    wrap.querySelectorAll('.remove-watch').forEach(btn =>
        btn.addEventListener('click', e => {
            removeFromWatchlist(e.target.dataset.sym);
        })
    );
}



/* Sync all card buttons after watchlist changes */
function syncWatchButtons() {
    const list = getWatchlist();

    document.querySelectorAll('.crypto-card .watch-toggle').forEach(btn => {
        const card = btn.closest('.crypto-card');
        if (!card) return;

        const symbol = card.querySelector('.font-bold')?.textContent?.trim();
        if (!symbol) return;

        const isWatched = list.includes(symbol);

        btn.textContent = isWatched ? 'Remove' : 'Watch';

        // Add/remove red styling
        if (isWatched) {
            btn.classList.add('bg-red-500', 'text-white');
            btn.classList.remove('border');
        } else {
            btn.classList.remove('bg-red-500', 'text-white');
            btn.classList.add('border');
        }
    });
}



/* realtime via socket.io */
function setupSocket(){
  try{
    socket = io();
  }catch(e){
    console.warn('Socket init failed, fallback to polling', e);
    startPolling();
    return;
  }
  socket.on('connect', ()=>{ socketConnected = true; if(POLL_TIMER){ clearInterval(POLL_TIMER); POLL_TIMER=null;} });
  socket.on('price_update', payload=>{
    if(!payload || !payload.coins) return;
    const map = new Map(payload.coins.map(c=> [c.symbol, c]));
    let changed = [];
    ALL_COINS = ALL_COINS.map(old => {
      if(map.has(old.symbol)){ const updated = map.get(old.symbol); if(Number(updated.close)!==Number(old.close)) changed.push({symbol: old.symbol, old: old.close, new: updated.close}); return updated; }
      return old;
    });
    if(ALL_COINS.length===0) ALL_COINS = payload.coins.slice();
    patchPriceChanges(changed);
    renderGainersLosers(); renderWatchlist(); updateQuickStats();
  });
  socket.on('disconnect', ()=>{ socketConnected=false; if(!POLL_TIMER) POLL_TIMER = setInterval(refreshAll, POLL_INTERVAL); });
}

async function patchPriceChanges(changedSymbols){
  if(!changedSymbols || changedSymbols.length===0) return;
  changedSymbols.forEach(ch=>{
    const cards = Array.from(document.querySelectorAll('#home-markets-grid .crypto-card'));
    cards.forEach(card=>{
      const symbol = card.querySelector('.font-bold')?.textContent?.trim();
      if(symbol === ch.symbol){
        const priceEl = card.querySelector('.price-value');
        if(!priceEl) return;
        priceEl.textContent = `$${formatMoney(ch.new)}`;
        card.animate([{ boxShadow: '0 0 0 0 rgba(16,185,129,0)' }, { boxShadow: ch.new > ch.old ? '0 12px 20px rgba(16,185,129,0.12)' : '0 12px 20px rgba(239,68,68,0.12)' }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }], { duration:800, easing:'ease-out' });
      }
    });
  });
}

/* fallback polling */
async function refreshAll(){
  try{
    let coins = await fetchJSON('/api/coins');
    coins = sortCoins(coins, document.getElementById('sortSelect').value || "close");
    ALL_COINS = coins;
    const limit = Number(document.getElementById('home-limit').value) || 10;
    await renderGrid(limit);
  }catch(err){ console.error('refreshAll error', err); }
}
function startPolling(){ if(POLL_TIMER) clearInterval(POLL_TIMER); POLL_TIMER = setInterval(refreshAll, POLL_INTERVAL); }

/* search */
function setupSearch(){ const input = document.getElementById('home-search-input'); if(!input) return; input.addEventListener('input', ()=>{ const q = input.value.trim().toLowerCase(); const cards = document.querySelectorAll('#home-markets-grid .crypto-card'); cards.forEach(card => card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none'); }); }

/* init */
document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const coins = await fetchJSON('/api/coins_with_change');
    const defaultSort = document.getElementById('sortSelect').value || "close";
    ALL_COINS = sortCoins(coins, defaultSort);

    const limit = Number(document.getElementById('home-limit').value) || 10;
    await renderGrid(limit);
  }catch(e){ console.error('Initial load failed', e); }


document.getElementById('sortSelect').addEventListener('change', async (e) => {
    CURRENT_SORT = e.target.value;
    ALL_COINS = sortCoins(ALL_COINS, CURRENT_SORT, SORT_DIRECTION);

    const limit = Number(document.getElementById('home-limit').value) || 10;
    await renderGrid(limit);
});
document.getElementById('home-limit').addEventListener('change', e => renderGrid(Number(e.target.value)));
document.getElementById('clear-watchlist').addEventListener('click', clearWatchlist);
  setupSearch();
  renderWatchlist();
  updateQuickStats();
  setupSocket();
  setTimeout(()=>{ if(!socketConnected && !POLL_TIMER) POLL_TIMER = setInterval(refreshAll, POLL_INTERVAL); }, 2000);
});
