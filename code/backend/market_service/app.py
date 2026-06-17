import sys, os

from backend.market_service.market_api import get_latest_coins, get_coin_history, get_coins_with_change, trend_series

from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/api/coins")
def api_coins():
    return jsonify(get_latest_coins())

@app.route("/api/coins/<symbol>")
def api_coin(symbol):
    return jsonify(get_coin_history(symbol.upper()))

@app.route("/api/coins_with_change")
def api_coins_with_change():
    return jsonify(get_coins_with_change())

@app.route("/api/onchain/<symbol>")
def api_onchain(symbol):
    days = 60
    response = {
        "active_addresses": trend_series(days, 500_000, 1_200_000),
        "transactions": trend_series(days, 200_000, 600_000),
        "exchange_flows": {
            "inflow": trend_series(days, 40_000, 150_000),
            "outflow": trend_series(days, 40_000, 160_000),
        },
        "whale_transactions": trend_series(days, 50, 300),
        "hash_rate": trend_series(days, 150, 450),
        "tvl": trend_series(days, 5_000_000_000, 60_000_000_000),
        "nvt": trend_series(days, 20, 150),
        "mvrv": trend_series(days, 0.7, 3.5),
    }
    return jsonify(response)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

