import sqlite3
import os
from threading import Lock

DB_FILENAME = "data_1000_coins_10_year.db"
DB_PATH = os.path.join(os.path.dirname(__file__), DB_FILENAME)

class Database:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
                    cls._instance.conn.row_factory = sqlite3.Row
        return cls._instance

    def query(self, query, args=(), one=False):
        cur = self.conn.cursor()
        cur.execute(query, args)
        rows = cur.fetchall()
        return rows[0] if one and rows else rows

def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None
