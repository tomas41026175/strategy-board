"""樣本切分:Hold-Out(MVP 預設)+ Walk-Forward 視窗產生器(預留)。"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import pandas as pd


@dataclass
class SplitConfig:
    mode: Literal["holdout", "wf_rolling", "wf_anchored"] = "holdout"
    is_ratio: float = 0.7  # holdout 樣本內占比
    train_bars: int = 504  # walk-forward 用
    test_bars: int = 126
    step_bars: int = 126


def holdout_index(df: pd.DataFrame, is_ratio: float) -> int:
    """回傳樣本內/外的切點 index;前端據此在線圖上分段著色。"""
    return int(len(df) * is_ratio)


def make_windows(df: pd.DataFrame, cfg: SplitConfig) -> list[tuple[range, range]]:
    """產生 (train, test) 視窗序列;walk-forward 用。"""
    n = len(df)
    windows: list[tuple[range, range]] = []
    start = 0
    while True:
        train_start = 0 if cfg.mode == "wf_anchored" else start
        train_end = start + cfg.train_bars
        test_end = train_end + cfg.test_bars
        if test_end > n:
            break
        windows.append((range(train_start, train_end), range(train_end, test_end)))
        start += cfg.step_bars
    return windows
