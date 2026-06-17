from flask import Flask, jsonify, render_template, request, send_from_directory, abort
import os
import logging
import requests
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from market_service.market_api import get_coin_history

# ===============================
# Flask setup
# ===============================
app = Flask(
    __name__,
    template_folder="../../templates",
    static_folder="../../static"
)
LOGO_FOLDER = os.path.join(app.static_folder, "logos")
logging.basicConfig(level=logging.INFO)

# ===============================
# Service URLs
# ===============================
MARKET_URL = "http://127.0.0.1:5001"
PREDICTION_URL = "http://127.0.0.1:5002"
SENTIMENT_URL = "http://127.0.0.1:5003"

# ===============================
# Pages
# ===============================
@app.route("/")
def home():
    return render_template("home.html")

@app.route("/markets")
def markets():
    return render_template("markets.html")

@app.route("/details/<symbol>")
def details(symbol):
    symbol = symbol.upper()
    history = get_coin_history(symbol) 
    return render_template("details.html", symbol=symbol, history=history)
@app.route("/profile")
def profile():
    return render_template("profile.html")

@app.route("/on-chain/<symbol>")
def on_chain(symbol):
    return render_template("on-chain.html", symbol=symbol.upper())

# ===============================
# Market APIs
# ===============================
@app.route("/api/coins")
def api_coins():
    return jsonify(requests.get(f"{MARKET_URL}/api/coins").json())

@app.route("/api/coins/<symbol>")
def api_coin(symbol):
    limit = request.args.get("limit", 30)
    return jsonify(requests.get(f"{MARKET_URL}/api/coins/{symbol}", params={"limit": limit}).json())

@app.route("/api/coins_with_change")
def api_coins_with_change():
    return jsonify(requests.get(f"{MARKET_URL}/api/coins_with_change").json())

@app.route("/api/onchain/<symbol>")
def api_onchain(symbol):
    return jsonify(requests.get(f"{MARKET_URL}/api/onchain/{symbol}").json())

# ===============================
# LSTM Prediction API
# ===============================
@app.route("/api/lstm/<symbol>")
def api_lstm(symbol):
    return jsonify(requests.get(f"{PREDICTION_URL}/api/lstm/{symbol}").json())

# ===============================
# Sentiment API
# ===============================
@app.route("/api/sentiment/<symbol>")
def api_sentiment(symbol):
    return jsonify(requests.get(f"{SENTIMENT_URL}/api/sentiment/{symbol}").json())

@app.route("/api/news/<symbol>")
def api_news(symbol):
    return jsonify(requests.get(f"{SENTIMENT_URL}/api/news/{symbol}").json())

@app.route("/api/combined-signal/<symbol>")
def api_combined_signal(symbol):
    return jsonify(
        requests.get(f"{SENTIMENT_URL}/api/combined-signal/{symbol}").json()
    )

# ===============================
# Logos
# ===============================
@app.route("/static/logos/<symbol>.png")
def get_logo(symbol):
    filename = f"{symbol.upper()}.png"
    file_path = os.path.join(LOGO_FOLDER, filename)
    if os.path.exists(file_path):
        return send_from_directory(LOGO_FOLDER, filename)
    abort(404)

# ===============================
# Health check
# ===============================
@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# ===============================
# Run
# ===============================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

