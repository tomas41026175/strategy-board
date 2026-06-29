"""均值回歸策略:RSI 超賣進場。"""
from __future__ import annotations

import pandas as pd

from .base import Param, Signals, Strategy, register_strategy


def _rsi(close: pd.Series, period: int) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, 1e-9)
    return 100 - 100 / (1 + rs)


@register_strategy
class RsiMeanRev(Strategy):
    name = "RSI 均值回歸"
    category = "meanrev"
    description = "RSI 跌破超賣門檻進場,回升至中性門檻出場;固定百分比停損。"
    params = {
        "period": Param("int", 14, 5, 30, 1, "RSI 週期"),
        "oversold": Param("int", 30, 10, 40, 1, "超賣門檻"),
        "exit_level": Param("int", 50, 45, 70, 1, "出場門檻"),
        "stop_pct": Param("float", 0.05, 0.01, 0.15, 0.005, "停損 %"),
    }

    def generate(self, df: pd.DataFrame, p: dict[str, float]) -> Signals:
        r = _rsi(df["close"], int(p["period"]))
        entries = (r < p["oversold"]) & (r.shift(1) >= p["oversold"])
        exits = (r > p["exit_level"]) & (r.shift(1) <= p["exit_level"])
        return Signals(
            entries=entries.fillna(False),
            exits=exits.fillna(False),
            sl_stop=float(p["stop_pct"]),
        )
