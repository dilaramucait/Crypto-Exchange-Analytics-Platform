import sqlite3
import os
import random
from datetime import datetime, timedelta
from backend.db_service.db import Database, row_to_dict

db = Database()

# --------------------------
# Trend simulation
# --------------------------
def trend_series(days, min_val, max_val):
    today = datetime.utcnow()
    value = random.uniform(min_val, max_val)
    out = []
    for i in range(days):
        date = (today - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        value *= random.uniform(0.98, 1.02)
        value = max(min_val, min(max_val, value))
        out.append({"date": date, "value": round(value, 2)})
    return out

# --------------------------
# Latest prices
# --------------------------
def get_latest_coins():
    rows = db.query("""
        SELECT dp.symbol, dp.date, dp.open, dp.high, dp.low,
               dp.close, dp.volume, dp.market_cap
        FROM daily_price dp
        JOIN (
            SELECT symbol, MAX(date) AS max_date
            FROM daily_price
            GROUP BY symbol
        ) latest
        ON dp.symbol = latest.symbol AND dp.date = latest.max_date
        ORDER BY dp.close DESC
    """)
    coins = []
    for r in rows:
        row = row_to_dict(r)
        prev = db.query(
            "SELECT close FROM daily_price WHERE symbol=? AND date < ? ORDER BY date DESC LIMIT 1",
            (row["symbol"], row["date"]), one=True
        )
        prev_close = prev["close"] if prev else row["close"]
        row["price"] = row["close"]
        row["change_pct"] = round((row["close"] - prev_close) / prev_close * 100, 2)
        coins.append(row)

    coins.sort(key=lambda x: x.get("close") or 0, reverse=True)
    
    return coins


# --------------------------
# Historical prices
# --------------------------
def get_coin_history(symbol, limit=None):
    sql = """
        SELECT date, open, high, low, close, volume
        FROM daily_price
        WHERE symbol=?
        ORDER BY date ASC
    """
    params = [symbol]

    if limit is not None:
        sql += " LIMIT ?"
        params.append(limit)

    rows = db.query(sql, params)
    return [row_to_dict(r) for r in rows]

# --------------------------
# Coins with 24h change
# --------------------------
def get_coins_with_change():
    rows = db.query("""
        SELECT dp.symbol, dp.date, dp.close, dp.volume, dp.market_cap
        FROM daily_price dp
        JOIN (
            SELECT symbol, MAX(date) AS max_date
            FROM daily_price
            GROUP BY symbol
        ) latest
        ON dp.symbol = latest.symbol AND dp.date = latest.max_date
    """)
    result = []
    for r in rows:
        d = row_to_dict(r)
        prev = db.query(
            "SELECT close FROM daily_price WHERE symbol=? AND date < ? ORDER BY date DESC LIMIT 1",
            (d["symbol"], d["date"]), one=True
        )
        d["pct_24h"] = round((d["close"] - prev["close"]) / prev["close"] * 100, 2) if prev else 0
        d["price"] = d["close"]
        result.append(d)
    # Sort by market cap
    result.sort(key=lambda x: x.get("close") or 0, reverse=True)
    return result
