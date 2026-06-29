"""五組指標 + 勝率分析計算。

組1 報酬 / 組2 風險 / 組3 風險調整 / 組4 交易品質(含勝率分析)/ 組5 對照。
勝率永遠與盈虧比、期望值一起回傳,UI 強制同框,避免「高勝率陷阱」。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .backtest import Trade


def _max_consecutive(flags: list[bool]) -> int:
    best = cur = 0
    for f in flags:
        cur = cur + 1 if f else 0
        best = max(best, cur)
    return best


def _cagr(equity: pd.Series, ppy: int) -> float:
    n_years = len(equity) / ppy
    last = float(equity.iloc[-1])
    if n_years <= 0 or last <= 0:
        return 0.0
    return last ** (1 / n_years) - 1


def _max_drawdown(equity: pd.Series) -> float:
    arr = equity.to_numpy()
    roll_max = np.maximum.accumulate(arr)
    dd = arr / roll_max - 1
    return float(dd.min())


def _sharpe(equity: pd.Series, ppy: int) -> float:
    rets = equity.pct_change().dropna()
    if rets.std() == 0 or len(rets) == 0:
        return 0.0
    return float(rets.mean() / rets.std() * np.sqrt(ppy))


def _sortino(equity: pd.Series, ppy: int) -> float:
    rets = equity.pct_change().dropna()
    downside = rets[rets < 0]
    if downside.std() == 0 or len(downside) == 0:
        return 0.0
    return float(rets.mean() / downside.std() * np.sqrt(ppy))


def compute_metrics(
    equity: pd.Series,
    trades: list[Trade],
    benchmark: pd.Series,
    win_rate_by_window: list[float] | None = None,
    ppy: int = 252,
) -> dict:
    pnls = pd.Series([t.pnl for t in trades], dtype=float)
    n = len(pnls)
    wins = pnls[pnls > 0]
    losses = pnls[pnls <= 0]

    win_rate = len(wins) / n if n else 0.0
    avg_win = float(wins.mean()) if len(wins) else 0.0
    avg_loss = float(abs(losses.mean())) if len(losses) else 0.0
    payoff = avg_win / avg_loss if avg_loss > 0 else 0.0
    expectancy = float(pnls.mean()) if n else 0.0
    profit_factor = (
        float(wins.sum() / abs(losses.sum())) if losses.sum() != 0 else 0.0
    )

    # 多空分離(本骨架只做多,空單欄位預留)
    longs = [t for t in trades]  # 全為多單
    long_wins = sum(1 for t in longs if t.pnl > 0)

    cagr = _cagr(equity, ppy)
    bench_cagr = _cagr(benchmark, ppy)
    mdd = _max_drawdown(equity)

    pnl_dist, pnl_edges = (
        np.histogram(pnls, bins=20) if n else (np.array([]), np.array([]))
    )

    return {
        # 組1 報酬
        "total_return": float(equity.iloc[-1] - 1),
        "cagr": cagr,
        # 組2 風險
        "max_drawdown": mdd,
        # 組3 風險調整
        "sharpe": _sharpe(equity, ppy),
        "sortino": _sortino(equity, ppy),
        "calmar": (cagr / abs(mdd)) if mdd != 0 else 0.0,
        # 組4 交易品質 + 勝率分析
        "n_trades": n,
        "win_rate": win_rate,
        "payoff": payoff,
        "expectancy": expectancy,
        "profit_factor": profit_factor,
        "avg_win": avg_win,
        "avg_loss": -avg_loss,
        "win_rate_long": (long_wins / len(longs)) if longs else 0.0,
        "n_long": len(longs),
        "win_rate_short": 0.0,
        "n_short": 0,
        "max_consec_win": _max_consecutive([t.pnl > 0 for t in trades]),
        "max_consec_loss": _max_consecutive([t.pnl <= 0 for t in trades]),
        "win_rate_by_window": win_rate_by_window or [],
        "pnl_distribution": pnl_dist.tolist(),
        "pnl_edges": pnl_edges.tolist(),
        # 組5 對照
        "benchmark_cagr": bench_cagr,
        "alpha_vs_benchmark": cagr - bench_cagr,
        # 警示旗標(UI 用)
        "warn_low_sample": n < 30,
        "warn_high_winrate_neg_exp": win_rate > 0.6 and expectancy <= 0,
    }
