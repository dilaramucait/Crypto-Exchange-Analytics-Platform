# 📊 Crypto Exchange Analytics Platform

## 📌 Overview
This project is a full-stack web application developed as part of the **Software Design and Architecture course**.

It analyzes cryptocurrency market data using historical datasets from major exchanges and provides a simple web interface with API endpoints for accessing and processing coin data.

The system is built as a modular prototype demonstrating backend development, data handling, and basic frontend integration.

---

## 🎯 Project Purpose
The goal of this project is to:
- Collect and store cryptocurrency market data
- Provide structured access to both historical and latest coin prices
- Demonstrate API-based communication between frontend and backend
- Apply software architecture concepts in a real web application

---

## 🏗️ Architecture
The system follows a layered architecture:

- Frontend Layer → HTML pages for user interaction  
- Backend Layer → Flask REST API  
- Data Layer → SQLite database (`data_1000_coins_10_year.db`)  
- API Layer → Endpoints for data retrieval and processing  

---

## 📡 API Endpoints

### Get latest coin prices
GET /api/coins

Returns the latest available price for all cryptocurrencies stored in the database.

---

### Get historical data for a specific coin
GET /api/coins/<SYMBOL>

Example:
GET /api/coins/BTC

Returns full historical data (OHLCV and market metrics) for the selected cryptocurrency.

---

## 🧩 Features
- Flask backend server
- REST API implementation
- SQLite database integration
- Historical cryptocurrency data storage (10+ years)
- Latest price extraction per symbol
- Multi-page HTML frontend
- Modular and layered system design

---

## 🛠️ Technologies Used
- Python
- Flask
- SQLite
- HTML
- CSS
- JavaScript

---

## 📂 Project Structure
project/
│── app.py
│── data_1000_coins_10_year.db
│── templates/
│   ├── index.html
│   ├── coins.html
│── static/
│   ├── style.css
│   ├── script.js
│── requirements.txt
│── README.md

---

## ▶️ How to Run

### 1. Clone the repository
git clone https://github.com/your-username/crypto-analytics-platform.git  
cd crypto-analytics-platform  

---

### 2. Install dependencies
pip install flask  

---

### 3. Run the application
python app.py  

---

### 4. Open in browser
http://127.0.0.1:5000  

---

## 📊 What This Project Demonstrates
- REST API design and development
- Backend engineering using Flask
- Database integration with SQLite
- Full-stack web application structure
- Data-driven system design principles

---

## 🔮 Future Improvements
- Add interactive charts (Chart.js / Plotly)
- Real-time cryptocurrency price updates
- Advanced analytics dashboard
- User authentication system
- Cloud deployment (AWS / Azure / Render)
- Migration to React frontend

---

## ⚠️ Note
This project was developed as part of the Software Design and Architecture course, following homework requirements for building a full-stack system with structured data processing, API design, and web integration.
