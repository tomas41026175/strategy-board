"""單參數掃描:固定其餘參數,對目標參數跑一組值,評估策略鈍感性(robustness)。"""
from __future__ import annotations

from pydantic import BaseModel, Field

from .models import BacktestRequest
from . import service

_METRIC_KEYS = (
    "cagr",
    "max_drawdown",
    "sharpe",
    "win_rate",
    "expectancy",
    "profit_factor",
    "n_trades",
)


class SweepRequest(BaseModel):
    strategy: str
    params: dict[str, float] = Field(default_factory=dict)
    symbol: str = "TX"
    start: str = "2018-01-01"
    end: str = "2024-12-31"
    cost: float = 0.0005
    param: str
    values: list[float]


def sweep(req: SweepRequest) -> list[dict]:
    """對 req.values 每個值組一次 BacktestRequest,回傳各次指標子集(依 values 順序)。"""
    results: list[dict] = []
    for v in req.values:
        bt_req = BacktestRequest(
            strategy=req.strategy,
            params={**req.params, req.param: v},
            symbol=req.symbol,
            start=req.start,
            end=req.end,
            cost=req.cost,
        )
        computed = service._compute(bt_req)
        metrics: dict = computed["metrics"]
        row = {"value": v} | {k: metrics[k] for k in _METRIC_KEYS}
        results.append(row)
    return results
