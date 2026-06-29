"""回測結果持久化 + input_hash 快取(sqlite3 stdlib,零額外依賴)。

同一組 (strategy, params, symbol, range, cost) → 同一 input_hash → 秒回快取。
"""
from __future__ import annotations

import hashlib
import json
import sqlite3

from .config import BACKEND_ROOT
from .models import BacktestRequest

DB_PATH = BACKEND_ROOT / "board.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                input_hash TEXT PRIMARY KEY,
                strategy   TEXT NOT NULL,
                symbol     TEXT NOT NULL,
                params     TEXT NOT NULL,
                start      TEXT,
                end        TEXT,
                metrics    TEXT NOT NULL,
                response   TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
            """
        )


def make_hash(req: BacktestRequest) -> str:
    payload = json.dumps(
        {
            "strategy": req.strategy,
            "params": req.params,
            "symbol": req.symbol,
            "start": req.start,
            "end": req.end,
            "cost": req.cost,
            "is_ratio": req.is_ratio,
            "split_mode": req.split_mode,
            "wf_opt_param": req.wf_opt_param,
            "wf_opt_values": req.wf_opt_values,
            "wf_train_bars": req.wf_train_bars,
            "wf_test_bars": req.wf_test_bars,
            "wf_step_bars": req.wf_step_bars,
        },
        sort_keys=True,
    )
    return hashlib.md5(payload.encode()).hexdigest()


def get_cached(input_hash: str) -> dict | None:
    with _conn() as c:
        row = c.execute(
            "SELECT response FROM runs WHERE input_hash = ?", (input_hash,)
        ).fetchone()
    return json.loads(row["response"]) if row else None


def save(input_hash: str, req: BacktestRequest, response: dict) -> None:
    with _conn() as c:
        c.execute(
            """
            INSERT OR REPLACE INTO runs
                (input_hash, strategy, symbol, params, start, end, metrics, response)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                input_hash,
                req.strategy,
                req.symbol,
                json.dumps(req.params),
                req.start,
                req.end,
                json.dumps(response["metrics"]),
                json.dumps(response),
            ),
        )


def list_runs(limit: int = 50) -> list[dict]:
    with _conn() as c:
        rows = c.execute(
            """
            SELECT input_hash, strategy, symbol, params, created_at, metrics
            FROM runs ORDER BY created_at DESC LIMIT ?
            """,
            (limit,),
        ).fetchall()
    out: list[dict] = []
    for r in rows:
        m = json.loads(r["metrics"])
        out.append(
            {
                "input_hash": r["input_hash"],
                "strategy": r["strategy"],
                "symbol": r["symbol"],
                "params": json.loads(r["params"]),
                "created_at": r["created_at"],
                "cagr": m.get("cagr"),
                "win_rate": m.get("win_rate"),
                "n_trades": m.get("n_trades"),
            }
        )
    return out
