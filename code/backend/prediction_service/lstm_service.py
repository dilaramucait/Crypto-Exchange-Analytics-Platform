import sqlite3
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_percentage_error, r2_score
import torch
import torch.nn as nn
import torch.optim as optim
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "../db_service/data_1000_coins_10_year.db")
LOOKBACK = 30
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size=64):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

def run_lstm(symbol):
    """
    Trains an LSTM model on historical price data
    and predicts the next closing price.
    """
    torch.manual_seed(42)
    np.random.seed(42)

    symbol = symbol.upper()
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql(
        "SELECT open, high, low, close, volume FROM daily_price WHERE symbol=? ORDER BY date ASC",
        conn, params=(symbol,)
    )
    conn.close()

    if len(df) < LOOKBACK + 10:
        return {"error": "Not enough data"}

    feature_cols = ["open", "high", "low", "volume"]

    # ----------------------------
    # Train / validation split FIRST
    # ----------------------------
    split_idx = int(len(df) * 0.7)
    train_df = df.iloc[:split_idx]
    val_df = df.iloc[split_idx - LOOKBACK:]

    # ----------------------------
    # Scaling (NO LEAKAGE)
    # ----------------------------
    feature_scaler = MinMaxScaler()
    close_scaler = MinMaxScaler()

    X_train_raw = feature_scaler.fit_transform(train_df[feature_cols])
    y_train_raw = close_scaler.fit_transform(train_df[["close"]])

    X_val_raw = feature_scaler.transform(val_df[feature_cols])
    y_val_raw = close_scaler.transform(val_df[["close"]])

    # ----------------------------
    # Sequence creation
    # ----------------------------
    def make_sequences(X, y):
        Xs, ys = [], []
        for i in range(LOOKBACK, len(X)):
            Xs.append(X[i-LOOKBACK:i])
            ys.append(y[i][0])
        return np.array(Xs), np.array(ys)

    X_train, y_train = make_sequences(X_train_raw, y_train_raw)
    X_val, y_val = make_sequences(X_val_raw, y_val_raw)

    # ----------------------------
    # Torch tensors
    # ----------------------------
    X_train_t = torch.tensor(X_train, dtype=torch.float32).to(DEVICE)
    y_train_t = torch.tensor(y_train, dtype=torch.float32).view(-1, 1).to(DEVICE)
    X_val_t = torch.tensor(X_val, dtype=torch.float32).to(DEVICE)
    y_val_t = torch.tensor(y_val, dtype=torch.float32).view(-1, 1).to(DEVICE)

    model = LSTMModel(X_train.shape[2]).to(DEVICE)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    best_loss = float("inf")
    patience = 5
    patience_counter = 0

    # ----------------------------
    # Training loop
    # ----------------------------
    for epoch in range(50):
        model.train()
        optimizer.zero_grad()
        loss = criterion(model(X_train_t), y_train_t)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_loss = criterion(model(X_val_t), y_val_t).item()

        if val_loss < best_loss:
            best_loss = val_loss
            best_state = model.state_dict()
            patience_counter = 0
        else:
            patience_counter += 1

        if patience_counter >= patience:
            break

    model.load_state_dict(best_state)
    model.eval()

    # ----------------------------
    # Validation metrics
    # ----------------------------
    with torch.no_grad():
        preds = model(X_val_t).cpu().numpy()

    y_true = close_scaler.inverse_transform(y_val.reshape(-1, 1))[:, 0]
    y_pred = close_scaler.inverse_transform(preds)[:, 0]

    # ----------------------------
    # Next-day prediction
    # ----------------------------
    last_features = feature_scaler.transform(df[feature_cols].iloc[-LOOKBACK:])
    last_seq = torch.tensor(last_features.reshape(1, LOOKBACK, -1), dtype=torch.float32).to(DEVICE)

    with torch.no_grad():
        next_price = close_scaler.inverse_transform(
            model(last_seq).cpu().numpy()
        )[0][0]

    return {
        "symbol": symbol,
        "predicted_price": float(next_price),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mape": float(mean_absolute_percentage_error(y_true, y_pred) * 100),
        "r2": float(r2_score(y_true, y_pred))
    }