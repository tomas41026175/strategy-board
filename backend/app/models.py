"""API request / response schema。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ParamSpec(BaseModel):
    name: str
    type: str
    default: float
    min: float
    max: float
    step: float
    label: str


class StrategyInfo(BaseModel):
    id: str
    name: str
    category: str
    description: str
    default_symbol: str = "TX"
    params: list[ParamSpec]


class BacktestRequest(BaseModel):
    strategy: str
    params: dict[str, float] = Field(default_factory=dict)
    symbol: str = "TX"
    start: str = "2018-01-01"
    end: str = "2025-12-31"
    cost: float = 0.0005
    is_ratio: float = 0.7  # 樣本內占比(線圖分段著色用)
    # walk-forward(預設 holdout,非破壞性)
    split_mode: str = "holdout"  # "holdout" | "walk_forward"
    wf_opt_param: str | None = None
    wf_opt_values: list[float] = Field(default_factory=list)
    wf_train_bars: int = 300
    wf_test_bars: int = 120
    wf_step_bars: int = 120


class SeriesPoint(BaseModel):
    time: str
    value: float


class BacktestResponse(BaseModel):
    strategy: str
    symbol: str
    data_source: str
    is_split_index: int
    metrics: dict
    equity: list[SeriesPoint]
    benchmark: list[SeriesPoint]
    drawdown: list[SeriesPoint]
    trades: list[dict]
