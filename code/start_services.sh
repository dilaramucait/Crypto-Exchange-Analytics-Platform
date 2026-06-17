#!/bin/bash

PORT=${PORT:-80}

# -------------------------------
# Start services in background
# -------------------------------
# Market Service
gunicorn -w 2 -b 0.0.0.0:5001 backend.market_service.app:app &

# Prediction Service
gunicorn -w 2 -b 0.0.0.0:5002 backend.prediction_service.app:app &

# Sentiment Service
gunicorn -w 2 -b 0.0.0.0:5003 backend.sentiment_service.app:app &

# API Gateway (frontend + proxy), listen on Azure PORT
gunicorn -w 2 -b 0.0.0.0:$PORT backend.api_gateway.app:app
