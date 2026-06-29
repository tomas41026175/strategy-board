# Strategy Board

個人用台股/台指期「策略回測工作台」。選標的 → 選策略 → 跑回測 → 看指標/勝率/線圖 → 比較與驗證。
全棧開源 + 免費資料,零訂閱。

## 功能

```
+--> 多策略清單(分類/搜尋)+ 參數面板(slider)
+--> 交易標的:台指期 TX / 小台 MTX / 微台 TMF / 0050 / 00631L / 2330
+--> 五組指標 + 勝率分析(勝率/盈虧比/期望值同框 + P&L 分布 + 警示)
+--> 權益曲線(IS/OOS 分段)+ 回撤圖 + Buy&Hold 對照 + 大型事件標記
+--> 參數掃描(敏感度)· Walk-Forward 驗證(WFE/OOS Decay)
+--> 策略比較(pin)· 回測歷史(SQLite)· 結果快取
+--> 資料源:FinMind 真實台股/台指期 → parquet 快取 → 合成 fallback
```

## 架構

```
React + Vite + Tailwind v4 + shadcn 風格 + lightweight-charts   (frontend/)
        |  REST (localhost)
FastAPI + 純 pandas 引擎 + SQLite + FinMind                      (backend/)
```

回測正確性保證:訊號統一 `shift(1)` 防未來函數、成本內建、停損由引擎套用。詳見 [docs/architecture.md](./docs/architecture.md)。

## 啟動

```bash
# 後端(:8000)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端(:5173)
cd frontend && pnpm install && pnpm dev
```

真實資料(FinMind)安裝與排錯見 [docs/getting-started.md](./docs/getting-started.md)。

## 文件

- [docs/index.md](./docs/index.md) — 文件索引
- [docs/getting-started.md](./docs/getting-started.md) — 安裝 / 啟動 / 真實資料
- [docs/architecture.md](./docs/architecture.md) — 架構 / 資料流
- [docs/api-reference.md](./docs/api-reference.md) — API 端點
- [docs/adding-a-strategy.md](./docs/adding-a-strategy.md) — 新增策略
- [docs/planning-spec.md](./docs/planning-spec.md) — 權威規格 / 里程碑 / 技術債
- [CLAUDE.md](./CLAUDE.md) — 給 Claude session 的專案指引

## 待辦(post-MVP)

引擎抽換 vectorbt(效能)、報告匯出、放空策略、walk-forward UI 深化。見 planning-spec §13/§14。
