"""FastAPI 進入點。

啟動:uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import store
from . import strategies  # noqa: F401  觸發策略 plugin 自動註冊
from .models import BacktestRequest
from .service import list_strategies, run
from .sweep import SweepRequest, sweep
from .symbols import list_symbols
from .events import list_events

app = FastAPI(title="Strategy Board API", version="0.1.0")
store.init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/strategies")
def get_strategies():
    return list_strategies()


@app.get("/runs")
def get_runs(limit: int = 50):
    return store.list_runs(limit)


@app.get("/symbols")
def get_symbols():
    return list_symbols()


@app.get("/events")
def get_events(start: str | None = None, end: str | None = None):
    return list_events(start, end)


@app.post("/backtest")
def post_backtest(req: BacktestRequest):
    try:
        return run(req)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"回測失敗:{e}")


@app.post("/sweep")
def post_sweep(req: SweepRequest):
    try:
        return sweep(req)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"掃描失敗:{e}")
