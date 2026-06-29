"""可交易標的(instrument)規格表。

每個標的記錄:
  id          ─ 標的代號(大寫;股票維持原格式)
  name        ─ 中文名稱
  type        ─ 'futures' | 'stock'
  point_value ─ 每點價值(台幣);期貨用於損益換算,股票固定為 1(元/股)
  category    ─ 顯示分類
"""
from __future__ import annotations

from typing import Literal, TypedDict


class InstrumentSpec(TypedDict):
    id: str
    name: str
    type: Literal["futures", "stock"]
    point_value: float
    category: str


# 策展清單:新增標的直接 append 此 list
_SYMBOLS: list[InstrumentSpec] = [
    # ── 台指期系列 ──────────────────────────────────────────────────────────
    {
        "id": "TX",
        "name": "台指期",
        "type": "futures",
        "point_value": 200.0,
        "category": "台指期",
    },
    {
        "id": "MTX",
        "name": "小型台指",
        "type": "futures",
        "point_value": 50.0,
        "category": "台指期",
    },
    {
        "id": "TMF",
        "name": "微型台指",
        "type": "futures",
        "point_value": 10.0,
        "category": "台指期",
    },
    # ── ETF ────────────────────────────────────────────────────────────────
    {
        "id": "0050",
        "name": "元大台灣50",
        "type": "stock",
        "point_value": 1.0,
        "category": "ETF",
    },
    {
        "id": "00631L",
        "name": "元大台灣50正2",
        "type": "stock",
        "point_value": 1.0,
        "category": "槓桿ETF",
    },
    # ── 個股 ───────────────────────────────────────────────────────────────
    {
        "id": "2330",
        "name": "台積電",
        "type": "stock",
        "point_value": 1.0,
        "category": "個股",
    },
]


def list_symbols() -> list[dict]:
    """回傳完整的可交易標的清單(shallow copy,防止外部修改污染來源)。"""
    return [dict(s) for s in _SYMBOLS]
