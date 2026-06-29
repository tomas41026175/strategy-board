"""回測核心(純 pandas/numpy 實作,零重依賴,保證可跑)。

production 可整段抽換成 vectorbt 的 Portfolio.from_signals;
對外契約(輸入 Signals、輸出 equity/trades/position)維持不變。

★關鍵正確性保證:執行訊號統一 shift(1)——用「前一根」的訊號決定「這一根」的
動作,避免未來函數(look-ahead bias)。
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..strategies.base import Signals


@dataclass
class Trade:
    entry_date: str
    exit_date: str
    entry_price: float
    exit_price: float
    pnl: float  # 含成本後的報酬率
    bars: int
    reason: str  # "signal" | "stop" | "eod"


@dataclass
class BacktestResult:
    equity: pd.Series  # index=date, 權益淨值(起點 1.0)
    position: pd.Series
    trades: list[Trade] = field(default_factory=list)


def run_backtest(
    df: pd.DataFrame,
    signals: Signals,
    cost_one_way: float = 0.0005,
) -> BacktestResult:
    """只做多事件式回測。

    df 需含 'close',index 為 DatetimeIndex。
    """
    close = df["close"].to_numpy(dtype=float)
    dates = df.index
    n = len(close)
    entries = signals.entries.reindex(df.index).fillna(False).to_numpy()
    exits = signals.exits.reindex(df.index).fillna(False).to_numpy()
    sl = signals.sl_stop

    position = np.zeros(n)
    trades: list[Trade] = []
    in_pos = False
    entry_price = 0.0
    entry_i = 0

    for i in range(n):
        # ★ shift(1):用前一根訊號決定這一根動作,防未來函數
        entry_sig = entries[i - 1] if i > 0 else False
        exit_sig = exits[i - 1] if i > 0 else False
        price = close[i]

        if in_pos:
            position[i] = 1.0
            stop_hit = sl is not None and price <= entry_price * (1 - sl)
            if exit_sig or stop_hit:
                ret = price / entry_price - 1 - 2 * cost_one_way
                trades.append(
                    Trade(
                        entry_date=str(dates[entry_i].date()),
                        exit_date=str(dates[i].date()),
                        entry_price=round(entry_price, 2),
                        exit_price=round(price, 2),
                        pnl=ret,
                        bars=i - entry_i,
                        reason="stop" if stop_hit and not exit_sig else "signal",
                    )
                )
                in_pos = False
                position[i] = 0.0
        elif entry_sig:
            in_pos = True
            entry_price = price
            entry_i = i
            position[i] = 1.0

    # 收尾:最後一根仍持倉 → 以收盤平倉
    if in_pos:
        price = close[n - 1]
        trades.append(
            Trade(
                entry_date=str(dates[entry_i].date()),
                exit_date=str(dates[n - 1].date()),
                entry_price=round(entry_price, 2),
                exit_price=round(price, 2),
                pnl=price / entry_price - 1 - 2 * cost_one_way,
                bars=n - 1 - entry_i,
                reason="eod",
            )
        )

    pos_series = pd.Series(position, index=df.index)
    daily_ret = df["close"].pct_change().fillna(0.0)
    # 持倉日享有當日報酬;換手日扣成本
    turnover = pos_series.diff().abs().fillna(pos_series.iloc[0])
    strat_ret = pos_series * daily_ret - turnover * cost_one_way
    equity = (1 + strat_ret).cumprod()

    return BacktestResult(equity=equity, position=pos_series, trades=trades)


def buy_and_hold_equity(df: pd.DataFrame) -> pd.Series:
    """Benchmark:買進持有。"""
    return (df["close"] / df["close"].iloc[0])
