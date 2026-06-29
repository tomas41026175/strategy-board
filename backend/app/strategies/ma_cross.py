"""趨勢策略:均線交叉(只做多)。"""
from __future__ import annotations

import pandas as pd

from .base import Param, Signals, Strategy, register_strategy


@register_strategy
class MaCross(Strategy):
    name = "均線交叉"
    category = "trend"
    description = "短均線上穿長均線做多,下穿出場;搭配固定百分比停損。"
    params = {
        "fast": Param("int", 20, 5, 60, 1, "短均線天數"),
        "slow": Param("int", 60, 20, 200, 1, "長均線天數"),
        "stop_pct": Param("float", 0.03, 0.01, 0.1, 0.005, "停損 %"),
    }

    def generate(self, df: pd.DataFrame, p: dict[str, float]) -> Signals:
        fast = df["close"].rolling(int(p["fast"])).mean()
        slow = df["close"].rolling(int(p["slow"])).mean()
        # 這裡的 shift(1) 是「比較前一根以判斷交叉」,非執行用 shift;
        # 執行用的 shift 由引擎統一處理(防未來函數)。
        cross_up = (fast > slow) & (fast.shift(1) <= slow.shift(1))
        cross_down = (fast < slow) & (fast.shift(1) >= slow.shift(1))
        return Signals(
            entries=cross_up.fillna(False),
            exits=cross_down.fillna(False),
            sl_stop=float(p["stop_pct"]),
        )
