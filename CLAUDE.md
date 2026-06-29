# CLAUDE.md — Strategy Board

> 個人用台股/台指期「策略回測工作台」。選標的 → 選策略 → 跑回測 → 看指標/勝率/線圖 → 比較/驗證。
> 本檔給未來的 Claude session;細節見 `docs/`(權威規格 `docs/planning-spec.md`)。

## 這是什麼

回測**結果的瀏覽與管理器**,不是下單系統。全棧開源 + 免費資料,零訂閱。
Out of scope:即時行情、真實下單、多人/權限、雲端部署。

## 技術棧

```
Frontend  React 18 + Vite + TypeScript(strict) + Tailwind v4 + shadcn 風格 + lightweight-charts v4
   |  REST / JSON (localhost:8000)
Backend   FastAPI + 純 pandas 引擎(production 可抽換 vectorbt)+ SQLite + FinMind
```

## 啟動

```bash
# 後端(:8000)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt              # 核心;FinMind 真實資料見下方 Gotchas
uvicorn app.main:app --reload --port 8000

# 前端(:5173)
cd frontend && pnpm install && pnpm dev
```

## 驗證(改動後必跑)

```bash
# 後端:python smoke + API
cd backend && source .venv/bin/activate
python -c "from app.service import run; from app.models import BacktestRequest; print(run(BacktestRequest(strategy='MaCross'))['metrics']['n_trades'])"
# 前端:型別 + build(最重要)
cd frontend && pnpm exec tsc -b && pnpm build
# E2E:Playwright(載入 → Run → 驗結果)
```

## 架構與關鍵檔

```
backend/app/
  main.py          FastAPI 路由(/strategies /backtest /sweep /runs /symbols /events)
  service.py       回測編排:_compute(無快取核心)/ run(快取包裝)/ resolve_params
  store.py         SQLite 持久化 + input_hash 快取
  models.py        pydantic request/response schema
  symbols.py       交易標的 registry(規格表)
  events.py        大型事件策展清單
  sweep.py         單參數掃描
  strategies/      策略 plugin(base.py 契約 + ma_cross / rsi_meanrev)
  engine/          backtest(回測核心)/ metrics(五組指標)/ split / walk_forward
  data/loader.py   FinMind → parquet 快取 → 合成 fallback
frontend/src/
  App.tsx          主編排(state + 接線)
  api/client.ts    fetch client(BASE = VITE_API_BASE ?? localhost:8000)
  types.ts         前端型別(須與後端 schema 同步)
  components/ui/   shadcn 風格元件(card/button/badge)
  features/        StrategyList / StrategyDetail / SymbolSelector / MetricsPanel /
                   WinRatePanel / Charts / TradesTable / CompareView / HistoryPanel /
                   SweepPanel / events.ts
  lib/utils.ts     cn() / pct() / num()
```

## 慣例(改 code 前必讀)

- **不可變**:建新物件,不 mutate(陣列用 map/filter/spread)。
- **策略 = plugin**:在 `strategies/` 放一個 `.py`,用 `@register_strategy` 標註,宣告 `params`(Board 自動生成 UI)、`default_symbol`,實作 `generate(df, p) -> Signals`。**核心不動**。見 `docs/adding-a-strategy.md`。
- **正確性保證集中在引擎,不在策略**:
  - 訊號統一 `shift(1)` 防未來函數(look-ahead)—— **策略不可自行 shift 執行訊號**。
  - 成本、停損由引擎套用;策略只產 entries/exits。
  - 策略是純函數:禁 I/O / 全域狀態 / 隨機。
- **勝率不可單獨呈現**:UI 強制「勝率 + 盈虧比 + 期望值」同框;有「高勝率負期望」「樣本<30」警示。
- **前後端契約雙邊同步**:改 `models.py` 的 response 欄位 → 同步改 `frontend/src/types.ts`(否則 tsc 擋)。
- **MUI 禁用**:UI 走 shadcn 風格 + Tailwind;金融圖一律 lightweight-charts(shadcn Chart 只用於簡單分布)。
- **開發記錄**:每次開發 append `dev-log/YYYY-MM-DD.md`(做了什麼/決策/踩坑)。

## Gotchas(踩過的坑)

- **FinMind on Python 3.14**:它 pin `lxml<5` 在 3.14 編譯失敗。繞路:
  ```bash
  pip install "lxml>=5.0.0"
  pip install --no-deps FinMind
  pip install ta nest_asyncio websocket-client aiohttp deprecation importlib_metadata loguru requests tqdm
  ```
  不裝也可運作(`data_source=synthetic` 自動 fallback)。
- **parquet 舊快取**:切換真實/合成資料源前,清 `backend/data_cache/*.parquet`(快取鍵只含 symbol+區間,不含資料源)。
- **合成資料種子**:用 `hashlib`(非 Python 內建 `hash()`,後者字串 per-process 加鹽,破壞可重現性)。
- **lightweight-charts markers**:一個 series 只能 `setMarkers` 一次 → 多組 marker(OOS 起點 + 事件)須 concat + 依 time 排序後一次設定。
- **台指期連續合約**:loader 用「日盤 position + 排除價差單 + 近月」近似;production 需正式 roll over。

## 多 agent 編排(本專案慣例)

fan-out subagent 前須選 design pattern 並經使用者確認(`agent-pattern-selection` rule)。
本專案大型功能批次用 **Supervisor pattern**:主 session 拆解 + 整合 shared 檔,subagent 只產自包含新檔 + 回傳整合片段。確認後 `touch /tmp/claude-agent-pattern-confirmed`(須獨立一則訊息先落地,避免與 spawn 競態)。

## 已知技術債 / 待辦

見 `docs/planning-spec.md` §13/§14:vectorbt 抽換(效能)、報告匯出、放空策略、walk-forward UI 深化、SQLite runs 歷史進階查詢。
