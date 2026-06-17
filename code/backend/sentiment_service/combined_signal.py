import requests
from sentiment_api import analyze_sentiment

MARKET_URL = "http://127.0.0.1:5001"

def combined_signal(symbol):
    sentiment = analyze_sentiment(symbol)
    sentiment_score = sentiment["score"]

    onchain = requests.get(f"{MARKET_URL}/api/onchain/{symbol}").json()

    active = onchain["active_addresses"]
    onchain_strength = 0

    if len(active) >= 2:
        onchain_strength = (
            active[-1]["value"] - active[0]["value"]
        ) / active[0]["value"]

    score = sentiment_score * 0.6 + onchain_strength * 0.4

    if score > 0.2:
        signal = "BUY"
    elif score < -0.2:
        signal = "SELL"
    else:
        signal = "HOLD"

    return {
        "signal": signal,
        "confidence": round(abs(score), 2),
        "details": {
            "sentiment_score": round(sentiment_score, 3),
            "onchain_strength": round(onchain_strength, 3)
        }
    }
