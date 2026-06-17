# 📊 Crypto Exchange Analytics Platform (Homework 4)

## 📌 Overview
This project is a **cryptocurrency analytics platform** developed as part of the **Software Design and Architecture course (Homework 4)**.

It is a **full-stack, microservices-based system** that provides:
- Market data visualization  
- Historical cryptocurrency prices  
- Sentiment analysis  
- On-chain metrics (simulated)  
- LSTM-based next-day price prediction  

The system demonstrates **modular architecture, API design, and containerized deployment using Docker**.

---

## 🎯 Project Goals
- Collect and process cryptocurrency market data  
- Provide structured access to historical and latest prices  
- Implement microservices-based system design  
- Integrate machine learning for price prediction  
- Demonstrate API-driven frontend-backend communication  
- Apply software architecture principles in a real system  

---

## 🏗️ Architecture

The system follows a **microservices architecture**:

- **Frontend / API Gateway** → Main entry point (Flask web UI + aggregation layer)  
- **Market Service** → Provides coin prices and historical OHLCV data  
- **Prediction Service** → LSTM model for next-day price prediction  
- **Sentiment Service** → News + sentiment analysis  
- **Data Layer** → SQLite database (historical crypto data)  

### Design Patterns Used
- **Facade Pattern** → API Gateway simplifies access to all services  
- **Adapter Pattern** → Normalizes responses between services  

---

## 🧩 Features

### 📈 Market Data
- Latest cryptocurrency prices
- 24h price changes
- Historical OHLCV data

### 🤖 Machine Learning
- LSTM-based next-day closing price prediction

### 🧠 Sentiment Analysis
- News-based sentiment scoring
- Combined sentiment signals per coin

### ⛓️ On-Chain Metrics (Simulated)
- Active addresses
- Transaction volume
- Whale activity
- TVL, NVT, MVRV indicators

### 🧱 System Design
- Microservices architecture
- REST API communication
- Modular and scalable structure

---

## 📡 API Endpoints

### Market Service
- `GET /api/coins` → Latest coin prices  
- `GET /api/coins/<symbol>` → Historical data  
- `GET /api/coins_with_change` → 24h change data  
- `GET /api/onchain/<symbol>` → On-chain metrics  

### Prediction Service
- `GET /api/lstm/<symbol>` → Next-day price prediction  

### Sentiment Service
- `GET /api/sentiment/<symbol>` → Sentiment score  
- `GET /api/news/<symbol>` → News data  
- `GET /api/combined-signal/<symbol>` → Combined signal  

---

## 🛠️ Technologies Used

- Python  
- Flask  
- SQLite  
- PyTorch (LSTM model)  
- NumPy / Pandas  
- Scikit-learn  
- Docker & Docker Compose  
- HTML / CSS / JavaScript  

---

## 📊 What This Project Demonstrates

-Microservices architecture design
-REST API development
-Machine learning integration (LSTM)
-Sentiment analysis pipeline
-Full-stack web development
-Docker-based deployment

---

## ⚠️ Notes / Limitations

-On-chain metrics are simulated (not real blockchain data)
-LSTM model is simplified for educational purposes
-Project is intended for academic demonstration

