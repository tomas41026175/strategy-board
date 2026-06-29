"""Backtest orchestration:取資料 → 跑引擎 → 算指標 → 組回應。"""
from __future__ import annotations

import pandas as pd

from .config import DEFAULT_COST_ONE_WAY, PERIODS_PER_YEAR
from .data.loader import load_ohlcv
from .engine.backtest import buy_and_hold_equity, run_backtest
from .engine.metrics import compute_metrics
from .engine.split import holdout_index
from .models import BacktestRequest, ParamSpec, StrategyInfo
from .strategies.base import get_registry
from . import store


def list_strategies() -> list[StrategyInfo]:
    out: list[StrategyInfo] = []
    for sid, cls in get_registry().items():
        params = [
            ParamSpec(
                name=k,
                type=p.type,
                default=p.default,
                min=p.min,
                max=p.max,
                step=p.step,
                label=p.label,
            )
            for k, p in cls.params.items()
        ]
        out.append(
            StrategyInfo(
                id=sid,
                name=cls.name,
                category=cls.category,
                description=cls.description,
                default_symbol=getattr(cls, "default_symbol", "TX"),
                params=params,
            )
        )
    return out


def _series_to_points(s: pd.Series) -> list[dict]:
    return [
        {"time": str(idx.date()), "value": round(float(v), 6)}
        for idx, v in s.items()
    ]


def resolve_params(strategy_id: str, params: dict[str, float]) -> dict[str, float]:
    """補齊未提供的參數預設值。strategy_id 不存在 → KeyError。"""
    cls = get_registry()[strategy_id]
    resolved = {k: p.default for k, p in cls.params.items()}
    resolved.update(params or {})
    return resolved


def _compute(req: BacktestRequest) -> dict:
    """實際回測計算(無快取、不寫 DB)。供 run() 與 sweep / walk-forward 重用。"""
    registry = get_registry()
    if req.strategy not in registry:
        raise KeyError(f"未知策略:{req.strategy}")

    cls = registry[req.strategy]
    params = resolve_params(req.strategy, req.params)

    df, source = load_ohlcv(req.symbol, req.start, req.end)
    strategy = cls()
    signals = strategy.generate(df, params)

    cost = req.cost if req.cost is not None else DEFAULT_COST_ONE_WAY
    result = run_backtest(df, signals, cost_one_way=cost)
    benchmark = buy_and_hold_equity(df)

    metrics = compute_metrics(
        result.equity, result.trades, benchmark, ppy=PERIODS_PER_YEAR
    )
    # 防呆:標記指標統計範圍。此處 metrics 永遠來自「全期 in-sample」回測;
    # walk-forward 的樣本外結果在 response["walk_forward"](見下方附加區塊)。
    # 無此標記極易把全期數字誤讀為樣本外(2026-06-29 dev-log 調查紀錄)。
    metrics["scope"] = "full_in_sample"

    roll_max = result.equity.cummax()
    drawdown = result.equity / roll_max - 1

    response = {
        "strategy": req.strategy,
        "symbol": req.symbol,
        "data_source": source,
        "is_split_index": holdout_index(df, req.is_ratio),
        "metrics": metrics,
        "equity": _series_to_points(result.equity),
        "benchmark": _series_to_points(benchmark),
        "drawdown": _series_to_points(drawdown),
        "trades": [t.__dict__ for t in result.trades],
    }

    # walk-forward(可選):附加 OOS 驗證結果,不影響既有欄位
    if req.split_mode == "walk_forward" and req.wf_opt_param and req.wf_opt_values:
        from .engine.split import SplitConfig
        from .engine.walk_forward import run_walk_forward

        wf = run_walk_forward(
            strategy_id=req.strategy,
            base_params=params,
            symbol=req.symbol,
            start=req.start,
            end=req.end,
            cost=cost,
            cfg=SplitConfig(
                mode="wf_rolling",
                train_bars=req.wf_train_bars,
                test_bars=req.wf_test_bars,
                step_bars=req.wf_step_bars,
            ),
            opt_param=req.wf_opt_param,
            opt_values=req.wf_opt_values,
        )
        response["walk_forward"] = wf
        # 把各視窗 OOS 勝率回填 metrics,讓勝率分析 panel 畫穩定度
        response["metrics"]["win_rate_by_window"] = wf.get("win_rate_by_window", [])
        # 防呆:wf 模式下,把真正的樣本外摘要附到 metrics,並升級 scope 標記,
        # 讓只看 metrics 的消費端(CLI / agent / sweep)不會把全期當樣本外。
        oos_eq = wf.get("equity") or []
        response["metrics"]["scope"] = "full_in_sample_with_oos"
        response["metrics"]["oos_summary"] = {
            "total_return": round(oos_eq[-1]["value"] - 1.0, 6) if oos_eq else None,
            "wfe": wf.get("wfe"),
            "oos_decay": wf.get("oos_decay"),
            "n_windows": wf.get("n_windows"),
        }

    return response


def run(req: BacktestRequest) -> dict:
    """快取包裝:命中 input_hash 秒回,否則計算 + 存檔。"""
    if req.strategy not in get_registry():
        raise KeyError(f"未知策略:{req.strategy}")

    input_hash = store.make_hash(req)
    cached = store.get_cached(input_hash)
    if cached is not None:
        cached["from_cache"] = True
        return cached

    response = _compute(req)
    store.save(input_hash, req, response)
    response["from_cache"] = False
    return response
