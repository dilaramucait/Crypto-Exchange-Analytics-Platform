// ===== CONFIG =====
const LOGO_BASE = "/static/logos";

// ===== FETCH HELPER =====
async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    return res.json();
}

// ===== WATCHLIST STORAGE =====
function getWatchlist() {
    try {
        const r = localStorage.getItem('watchlist_v1');
        return r ? JSON.parse(r) : [];
    } catch {
        return [];
    }
}

function saveWatchlist(arr) {
    localStorage.setItem('watchlist_v1', JSON.stringify(arr));
}

function removeFromWatchlist(sym) {
    const s = new Set(getWatchlist());
    s.delete(sym);
    saveWatchlist([...s]);
    updateProfileWatchlistUI();
}

// ===== FORMATTERS =====
function formatMoney(n) {
    if (n == null || isNaN(n)) return "-";
    return Number(n).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== LOAD PROFILE =====
async function loadProfile() {
    try {
        const watchlist = getWatchlist();

        document.getElementById('username').textContent = "DemoUser";
        document.getElementById('email').textContent = "demo@example.com";
        document.getElementById('created').textContent = "2023-01-15";
        document.getElementById('last-login').textContent = "2025-12-13";

        document.getElementById('watchlist-count').textContent = watchlist.length;
        document.getElementById('stat-watchlist').textContent = watchlist.length;

        document.getElementById('stat-portfolio').textContent =
            "$" + (Math.random() * 50000).toFixed(2);

        document.getElementById('stat-recent').textContent =
            Math.floor(Math.random() * 10);

        updateProfileWatchlistUI(watchlist);

    } catch (err) {
        console.error("Profile load failed", err);
    }
}

// ===== WATCHLIST UI (HOME-STYLE DATA) =====
async function updateProfileWatchlistUI(list = null) {
    const container = document.getElementById("watched-coins");
    const emptyMsg = document.getElementById("no-watched");
    if (!container) return;

    if (!list) list = getWatchlist();

    container.innerHTML = "";

    if (list.length === 0) {
        emptyMsg.classList.remove("hidden");
        return;
    }
    emptyMsg.classList.add("hidden");

    // fetch same data as home
    let allCoins = [];
    try {
        allCoins = await fetchJSON("/api/coins_with_change");
    } catch (e) {
        console.error("Failed to load coin data", e);
    }

    const map = new Map(allCoins.map(c => [c.symbol, c]));

    [...list].reverse().forEach(symbol => {
        const coin = map.get(symbol) || {};
        const logo = `${LOGO_BASE}/${symbol.toUpperCase()}.png`;

        const price = coin.close;
        const pct = coin.pct_24h;
        const vol = coin.volume;

        const pctClass =
            pct == null ? "" :
            pct >= 0 ? "text-green-500" : "text-red-500";

        const pctText =
            pct == null ? "-" :
            (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";

        container.innerHTML += `
            <div class="flex items-center justify-between gap-4 p-4 rounded-xl
                        border bg-white dark:bg-gray-800 shadow">

                <div class="flex items-center gap-3">
                    <img src="${logo}"
                         onerror="this.src='https://via.placeholder.com/40?text=${symbol[0]}'"
                         class="w-10 h-10 rounded-full border bg-white object-contain">

                    <div>
                        <div class="font-bold text-lg">${symbol}</div>
                        <div class="text-sm opacity-70">
                            $${formatMoney(price)}
                            <span class="${pctClass} ml-1">${pctText}</span>
                        </div>
                        <div class="text-xs opacity-60">
                            Vol: ${vol ? Number(vol).toLocaleString() : "-"}
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <a href="/details/${symbol}"
                       class="px-3 py-1.5 rounded-lg border text-sm
                              hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        Details
                    </a>

                    <button onclick="removeFromWatchlist('${symbol}')"
                        class="px-3 py-1.5 rounded-lg bg-red-500 text-white
                               text-sm hover:bg-red-600 transition">
                        Remove
                    </button>
                </div>
            </div>
        `;
    });
}

// ===== DEMO BUTTONS =====
document.getElementById("edit-profile")?.addEventListener("click", () => {
    alert("Edit Profile clicked!");
});

document.getElementById("delete-account")?.addEventListener("click", () => {
    alert("Delete Account clicked!");
});

// ===== INIT =====
loadProfile();
