# 新增一個策略

策略是 plugin:在 `backend/app/strategies/` 放一個 `.py`,用 `@register_strategy` 標註即可。**核心不動**,Board 會自動列出、依 `params` 生成 UI 控件。

## 契約

策略只負責「產生訊號」(entries/exits 布林序列)。引擎統一處理 shift 防未來函數、成本、停損、指標 —— **策略不要碰這些**。

```python
# backend/app/strategies/my_strategy.py
from __future__ import annotations

import pandas as pd

from .base import Param, Signals, Strategy, register_strategy


@register_strategy
class MyStrategy(Strategy):
    name = "我的策略"
    category = "trend"           # trend | meanrev | intraday
    description = "一句話說明進出場邏輯"
    default_symbol = "TX"        # 預設標的(UI 可改)
    params = {
        # name: Param(type, default, min, max, step, label)
        "lookback": Param("int", 20, 5, 60, 1, "回看天數"),
        "stop_pct": Param("float", 0.03, 0.01, 0.1, 0.005, "停損 %"),
    }

    def generate(self, df: pd.DataFrame, p: dict[str, float]) -> Signals:
        # df: OHLCV，index 為 DatetimeIndex；p: 已補預設的參數
        ma = df["close"].rolling(int(p["lookback"])).mean()
        entries = (df["close"] > ma) & (df["close"].shift(1) <= ma.shift(1))
        exits = (df["close"] < ma) & (df["close"].shift(1) >= ma.shift(1))
        return Signals(
            entries=entries.fillna(False),
            exits=exits.fillna(False),
            sl_stop=float(p["stop_pct"]),   # 可選;引擎套用停損
        )
```

## 規則(DO / DON'T)

```
必須                              禁止
+--> 繼承 Strategy                +--> 自行 shift 執行訊號(引擎統一 shift(1))
+--> 宣告 name/category/params    +--> 讀檔 / 打 API / 查 DB
+--> generate 回 Signals          +--> 使用未來資料(look-ahead)
+--> 輸出與 df 等長、同 index      +--> 全域可變狀態 / 隨機(破壞可重現)
```

> 註:`generate` 內可用 `shift(1)` 來「比較前一根判斷交叉」——那是計算,不是執行 shift。
> 執行用的 shift(下單延遲一根)由引擎做,策略不要重複。

## 步驟

1. 新增 `backend/app/strategies/my_strategy.py`(如上)。
2. 後端會在啟動時自動匯入註冊(`strategies/__init__.py` 掃描目錄)。
3. 重啟 `uvicorn`,前端重整 → 清單出現新策略,參數面板自動生成。
4. 驗證:
   ```bash
   python -c "from app.service import run; from app.models import BacktestRequest; \
     print(run(BacktestRequest(strategy='MyStrategy'))['metrics'])"
   ```

## 參數會自動接到的功能

宣告好 `params` 後,免額外工就能用:
- **參數面板**(slider)
- **參數掃描**(`/sweep`:選一個參數掃範圍看敏感度)
- **walk-forward**(選一個 int 參數做樣本內最佳化)

## 目前內建策略(可參考)

- `ma_cross.py` — 均線交叉(趨勢,低勝率高盈虧比)
- `rsi_meanrev.py` — RSI 均值回歸(高勝率低盈虧比)
