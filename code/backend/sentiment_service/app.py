import sys, os
sys.path.append(os.path.dirname(__file__))

from flask import Flask, jsonify
from sentiment_api import analyze_sentiment, news_sentiment
from combined_signal import combined_signal

app = Flask(__name__)

@app.route("/api/sentiment/<symbol>")
def api_sentiment(symbol):
    return jsonify(analyze_sentiment(symbol.upper()))

@app.route("/api/news/<symbol>")
def api_news(symbol):
    return jsonify(news_sentiment(symbol.upper()))

@app.route("/api/combined-signal/<symbol>")
def api_combined_signal(symbol):
    return jsonify(combined_signal(symbol.upper()))

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=5003)
