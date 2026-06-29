"""台股 / 全球重大市場事件策展清單，供線圖標記使用。"""
from __future__ import annotations

from typing import TypedDict


class MarketEvent(TypedDict):
    date: str
    label: str
    category: str  # "crash" | "policy" | "geopolitical" | "other"
    severity: str  # "high" | "medium"


EVENTS: list[MarketEvent] = [
    {
        "date": "2018-02-06",
        "label": "波動率風暴 (VIX 急殺)",
        "category": "crash",
        "severity": "high",
    },
    {
        "date": "2018-10-11",
        "label": "中美貿易戰修正",
        "category": "geopolitical",
        "severity": "high",
    },
    {
        "date": "2019-05-10",
        "label": "美中關稅升至 25%（第三輪對中課稅）",
        "category": "geopolitical",
        "severity": "medium",
    },
    {
        "date": "2020-03-19",
        "label": "COVID-19 全球股災（熔斷）",
        "category": "crash",
        "severity": "high",
    },
    {
        "date": "2020-11-09",
        "label": "輝瑞 BNT 疫苗宣布 90% 有效率",
        "category": "other",
        "severity": "medium",
    },
    {
        "date": "2021-05-12",
        "label": "台灣本土疫情爆發（三級警戒）",
        "category": "other",
        "severity": "medium",
    },
    {
        "date": "2022-01-05",
        "label": "Fed 升息循環起點（FOMC 議事紀錄鷹派轉向）",
        "category": "policy",
        "severity": "high",
    },
    {
        "date": "2022-02-24",
        "label": "俄羅斯入侵烏克蘭",
        "category": "geopolitical",
        "severity": "high",
    },
    {
        "date": "2022-10-25",
        "label": "升息熊市低點（台股止跌回升）",
        "category": "policy",
        "severity": "medium",
    },
    {
        "date": "2023-03-10",
        "label": "SVB 矽谷銀行倒閉",
        "category": "other",
        "severity": "medium",
    },
    {
        "date": "2024-08-05",
        "label": "日圓套利平倉黑色星期一",
        "category": "crash",
        "severity": "high",
    },
]


def list_events(
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """回傳依日期升序排列的事件清單。

    Args:
        start: 起始日期（含，格式 YYYY-MM-DD）。None 表示不限。
        end:   結束日期（含，格式 YYYY-MM-DD）。None 表示不限。

    Returns:
        符合區間的 MarketEvent list，依 date 升序排列。
    """
    result: list[MarketEvent] = EVENTS
    if start is not None:
        result = [e for e in result if e["date"] >= start]
    if end is not None:
        result = [e for e in result if e["date"] <= end]
    return sorted(result, key=lambda e: e["date"])
