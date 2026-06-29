"""策略 plugin 介面契約。

契約重點:
  - 策略只負責「產生訊號」(entries / exits 布林序列)。
  - 引擎統一保證:shift 防未來函數、成本、停損、指標計算。
  - 策略是純函數:同樣 df + params 必得同樣輸出;禁止 I/O / 全域狀態 / 隨機。
  - 所有可調參數必須在 `params` 宣告,Board 會據此自動生成 UI 控件。
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

import pandas as pd

ParamType = Literal["int", "float"]


@dataclass
class Param:
    """單一可調參數的宣告(供前端生成 slider / input)。"""

    type: ParamType
    default: float
    min: float
    max: float
    step: float = 1
    label: str = ""


@dataclass
class Signals:
    """策略輸出。entries/exits 必須與輸入 df 等長、同 index。"""

    entries: pd.Series
    exits: pd.Series
    sl_stop: float | None = None  # 例 0.03 = 3% 停損(引擎套用)
    tp_stop: float | None = None


class Strategy(ABC):
    name: str = ""
    category: Literal["trend", "meanrev", "intraday"] = "trend"
    description: str = ""
    default_symbol: str = "TX"  # 預設交易標的;UI 可覆寫
    params: dict[str, Param] = {}

    @abstractmethod
    def generate(self, df: pd.DataFrame, p: dict[str, float]) -> Signals:
        """回傳進出場訊號。

        禁止:① 自行 shift 執行訊號(引擎統一做)
              ② 使用未來資料(只能用到當根為止)
              ③ 任何 I/O / 全域狀態 / 隨機性
        """
        raise NotImplementedError


_REGISTRY: dict[str, type[Strategy]] = {}


def register_strategy(cls: type[Strategy]) -> type[Strategy]:
    """plugin 用此 decorator 註冊自己。"""
    _REGISTRY[cls.__name__] = cls
    return cls


def get_registry() -> dict[str, type[Strategy]]:
    return _REGISTRY
