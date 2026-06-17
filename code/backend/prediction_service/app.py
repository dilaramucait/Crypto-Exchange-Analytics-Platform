import sys, os

from backend.prediction_service.lstm_service import run_lstm

from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/api/lstm/<symbol>")
def api_lstm(symbol):
    result = run_lstm(symbol.upper())
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5002)