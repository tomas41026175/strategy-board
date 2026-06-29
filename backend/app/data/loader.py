"""資料層:FinMind(免費 tier)→ parquet 快取 → 合成資料 fallback。

三層保證:
  1. 命中本機 parquet 快取 → 直接回(規避 FinMind 免費額度限制)。
  2. 未命中 → 嘗試 FinMind 抓(台股 / 台指期)。
  3. FinMind 不可用(未安裝 / 無網路 / Python 3.14 相容問題)→ 合成走勢,
     確保整條鏈「開箱即跑」。

註:台指期連續合約此處用「每日最大量合約」近似,production 需做正式的
轉倉接續(roll over)。
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from ..config import DATA_CACHE_DIR


def _cache_path(symbol: str, start: str, end: str):
    return DATA_CACHE_DIR / f"{symbol}_{start}_{end}.parquet"


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """統一欄位為 open/high/low/close/volume,index 為 DatetimeIndex。"""
    rename = {"max": "high", "min": "low", "Trading_Volume": "volume"}
    df = df.rename(columns=rename)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
    df = df[cols]
    return df[df["close"] > 0].dropna(subset=["close"])


def _load_finmind(symbol: str, start: str, end: str) -> pd.DataFrame:
    from FinMind.data import DataLoader  # 延遲匯入:沒裝也不影響 fallback

    dl = DataLoader()
    if symbol.upper() in {"TX", "MTX", "TMF"}:
        raw = dl.taiwan_futures_daily(
            futures_id=symbol.upper(), start_date=start, end_date=end
        )
        # 只取日盤(排除夜盤 after_market)
        if "trading_session" in raw.columns:
            raw = raw[raw["trading_session"] == "position"]
        # 連續合約近似:排除價差單(contract_date 含 '/'),每日取近月(contract_date 最小)
        if "contract_date" in raw.columns:
            raw = raw[~raw["contract_date"].astype(str).str.contains("/")]
            raw = raw.sort_values("contract_date").groupby(
                "date", as_index=False
            ).first()
    else:
        raw = dl.taiwan_stock_daily(stock_id=symbol, start_date=start, end_date=end)
    if raw is None or raw.empty:
        raise ValueError("FinMind 回傳空資料")
    return _normalize(raw)


def _synthetic(symbol: str, start: str, end: str) -> pd.DataFrame:
    """合成日 K(幾何布朗運動);種子由 symbol 決定 → 跨 process 可重現。

    註:不可用 Python 內建 hash(),它對字串會 per-process 加鹽,
    導致每次重啟產出不同資料;改用 hashlib 確保決定性。
    """
    import hashlib

    idx = pd.bdate_range(start=start, end=end)
    seed = int(hashlib.md5(symbol.encode()).hexdigest(), 16) % (2**32)
    rng = np.random.default_rng(seed)
    n = len(idx)
    drift, vol = 0.0003, 0.012
    rets = rng.normal(drift, vol, n)
    close = 18000 * np.exp(np.cumsum(rets))
    high = close * (1 + np.abs(rng.normal(0, 0.004, n)))
    low = close * (1 - np.abs(rng.normal(0, 0.004, n)))
    open_ = close * (1 + rng.normal(0, 0.003, n))
    vol_ = rng.integers(50000, 150000, n)
    return pd.DataFrame(
        {"open": open_, "high": high, "low": low, "close": close, "volume": vol_},
        index=idx,
    )


def load_ohlcv(symbol: str, start: str, end: str) -> tuple[pd.DataFrame, str]:
    """回傳 (df, source)。source ∈ {'cache', 'finmind', 'synthetic'}。"""
    cache = _cache_path(symbol, start, end)
    if cache.exists():
        return pd.read_parquet(cache), "cache"

    try:
        df = _load_finmind(symbol, start, end)
        source = "finmind"
    except Exception:
        df = _synthetic(symbol, start, end)
        source = "synthetic"

    try:
        df.to_parquet(cache)
    except Exception:
        pass  # 快取失敗不阻斷主流程
    return df, source
