"""趨勢策略:唐奇安通道突破(海龜法則核心,只做多)。

與 ORB(開盤區間突破)同家族 —— 突破 + 順勢 + 小停損 + 讓利潤奔跑。
ORB 需分鐘級資料(開盤後 N 分鐘區間),本引擎為日線級別,故以「前 N 日區間」
取代「開盤區間」,在日 K 上等價表達同一交易模式。

模式對照:
  進場  突破前 entry_n 日最高   -> 方向明確才追(右側交易)
  出場  跌破前 exit_n 日最低     -> 讓利潤奔跑(海龜式追蹤出場)
  停損  固定 % (引擎套用)        -> 假突破時小虧認賠
"""
from __future__ import annotations

import pandas as pd

from .base import Param, Signals, Strategy, register_strategy


@register_strategy
class DonchianBreakout(Strategy):
    name = "唐奇安通道突破"
    category = "trend"
    description = (
        "突破前 N 日最高做多,跌破前 M 日最低出場(讓利潤奔跑);搭配固定 % 停損防假突破。"
        "順勢家族:低勝率、高盈虧比,靠賠率不靠勝率。"
    )
    default_symbol = "TMF"
    params = {
        "entry_n": Param("int", 20, 5, 60, 1, "進場通道(突破前 N 日高)"),
        "exit_n": Param("int", 10, 5, 40, 1, "出場通道(跌破前 M 日低)"),
        "stop_pct": Param("float", 0.02, 0.005, 0.08, 0.005, "停損 %"),
    }

    def generate(self, df: pd.DataFrame, p: dict[str, float]) -> Signals:
        entry_n = int(p["entry_n"])
        exit_n = int(p["exit_n"])
        # shift(1):通道只看「前一根為止」的高低,排除當根 ——
        # 否則 rolling.max 含當根 high,close 永遠 <= 當根 high 而無法突破。
        # 此為指標層 shift(同 ma_cross),非執行層;執行用 shift(1) 由引擎統一處理。
        upper = df["high"].rolling(entry_n).max().shift(1)
        lower = df["low"].rolling(exit_n).min().shift(1)
        entries = df["close"] > upper
        exits = df["close"] < lower
        return Signals(
            entries=entries.fillna(False),
            exits=exits.fillna(False),
            sl_stop=float(p["stop_pct"]),
        )
