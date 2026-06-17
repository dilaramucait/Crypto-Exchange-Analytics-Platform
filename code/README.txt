# Homework 4
======================================================

Overview
--------
This project is a cryptocurrency dashboard that provides market data, historical prices, on-chain metrics, 
sentiment analysis, and next-day price predictions using an LSTM model. The application is designed as 
microservices, making it modular, scalable, and easy to maintain. It is fully containerized using Docker 
for easy deployment.

Features
--------
- Market Overview: Displays latest coin prices and 24h changes.
- Historical Prices: Shows historical OHLCV (open, high, low, close, volume) data.
- LSTM Price Prediction: Predicts the next-day closing price for a selected coin.
- Sentiment Analysis: Aggregates news and social sentiment for coins.
- On-Chain Metrics: Simulated trends including active addresses, transactions, inflows/outflows, 
  whale activity, hash rate, TVL, NVT, and MVRV.
- Microservices Architecture: Each major feature runs as an independent service.

Architecture
------------
The project follows a microservices pattern:
- Market Service (market_service): Provides market and historical data via APIs.
- Prediction Service (prediction_service): Runs an LSTM model to predict next-day prices.
- Sentiment Service (sentiment_service): Provides sentiment and news data.
- Frontend / API Gateway (api_gateway): Aggregates data from microservices and serves web pages.

Design Patterns:
- Facade: The frontend API acts as a single entry point for the client.
- Adapter: Translates service APIs into a consistent format for the frontend.

Installation
------------
Prerequisites:
- Docker Desktop
- Docker Compose

Running Locally:
1. Clone the repository.
2. Open a terminal in the project root.
3. Build and start all services:
   docker compose up --build
4. Access the application at: http://localhost:5000

Service Ports:
- Frontend / API Gateway: 5000
- Market Service: 5001
- Prediction Service: 5002
- Sentiment Service: 5003

Usage / API Endpoints
---------------------
Market APIs:
- GET /api/coins          -> Latest coins data
- GET /api/coins/<symbol> -> Historical prices for a coin
- GET /api/coins_with_change -> Coins with 24h change
- GET /api/onchain/<symbol>  -> On-chain metrics (simulated)

LSTM Prediction:
- GET /api/lstm/<symbol>  -> Next-day predicted closing price

Sentiment APIs:
- GET /api/sentiment/<symbol> -> Sentiment score
- GET /api/news/<symbol>      -> Coin news
- GET /api/combined-signal/<symbol> -> Combined sentiment signal

Notes / Limitations
-------------------
- On-chain metrics are simulated, not from real blockchain data.
- Designed for demonstration and educational purposes.

Libraries / Technologies
------------------------
- Python 3.x
- Flask (API Gateway and services)
- PyTorch (LSTM prediction)
- SQLite (historical price database)
- Docker & Docker Compose (containerization)
- scikit-learn (data preprocessing)
- NumPy / pandas (data handling)

References
----------
- Flask Documentation: https://flask.palletsprojects.com/
- PyTorch Documentation: https://pytorch.org/
- MinMaxScaler - scikit-learn: https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.MinMaxScaler.html
- Microservices Architecture Guide: https://medium.com/@Jvishal/microservices-architecture-a-practical-guide-with-java-spring-boot-implementation-7fd0e5bf8752
