# Getting Started

## 需求

- Python 3.12+(實測 3.14)
- Node 20+ / pnpm 10+
- macOS / Linux

## 啟動

### 後端(:8000)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

不裝 FinMind 也能跑 —— 資料層會自動 fallback 到合成資料(`data_source=synthetic`),整條鏈完整可用。

### 前端(:5173)

```bash
cd frontend
pnpm install
pnpm dev
```

開 <http://localhost:5173>。

## 真實資料(選用:FinMind 免費 tier)

FinMind 在 Python 3.14 需繞路安裝(它 pin `lxml<5`,在 3.14 編譯失敗):

```bash
source backend/.venv/bin/activate
pip install "lxml>=5.0.0"
pip install --no-deps FinMind
pip install ta nest_asyncio websocket-client aiohttp deprecation importlib_metadata loguru requests tqdm
```

裝好後**清快取**讓真實資料生效(快取鍵不含資料源):

```bash
rm -f backend/data_cache/*.parquet backend/board.db
```

驗證真實資料:回測時 `data_source` 應為 `finmind`。免費 tier 無需 token(anonymous login)。

## 驗證(改動後必跑)

```bash
# 後端 smoke
cd backend && source .venv/bin/activate
python -c "from app.service import run; from app.models import BacktestRequest; print(run(BacktestRequest(strategy='MaCross'))['metrics'])"

# 後端 API
curl -s localhost:8000/strategies | python3 -m json.tool

# 前端型別 + build(最重要)
cd frontend && pnpm exec tsc -b && pnpm build
```

## 常見問題

| 症狀 | 原因 / 解法 |
|------|------|
| `data_source` 一直是 synthetic | FinMind 未裝成功,或 parquet 舊快取 → 清 `data_cache/` |
| FinMind 裝不起來(lxml 編譯失敗) | Python 3.14 須走上方 `--no-deps` 繞路 |
| 前端 tsc 報型別不存在 | 後端改了 schema,前端 `types.ts` 未同步 |
| 換真實資料後數字沒變 | parquet 快取殘留合成資料 → 清 `data_cache/` |
