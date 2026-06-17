from flask import jsonify
from textblob import TextBlob

def analyze_sentiment(symbol):
    try:
        texts = [
            f"{symbol} shows strong on-chain activity",
            f"Investors remain cautious on {symbol}",
            f"{symbol} sentiment slightly improves"
        ]
        scores = [TextBlob(t).sentiment.polarity for t in texts]
        avg = sum(scores) / len(scores)
        if avg > 0.1:
            label = "Bullish"
        elif avg < -0.1:
            label = "Bearish"
        else:
            label = "Neutral"
        return {"score": round(avg, 3), "label": label}
    except Exception:
        return {"score": 0, "label": "Neutral"}


def news_sentiment(symbol):
    return [
        {"title": f"{symbol} market trades sideways", "sentiment": "Neutral"},
        {"title": f"Analysts cautious on {symbol}", "sentiment": "Neutral"},
        {"title": f"{symbol} long-term outlook positive", "sentiment": "Positive"},
    ]
