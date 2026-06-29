# API Reference

Base URL:`http://localhost:8000`(前端用 `VITE_API_BASE` 覆寫)

## GET /health

→ `{ "status": "ok" }`

## GET /strategies

→ `StrategyInfo[]`

```ts
StrategyInfo {
  id: string; name: string;
  category: "trend" | "meanrev" | "intraday";
  description: string;
  default_symbol: string;
  params: { name; type:"int"|"float"; default; min; max; step; label }[];
}
```

## POST /backtest

Request:
```ts
{
  strategy: string;
  params: Record<string, number>;
  symbol?: string = "TX";
  start?: string = "2018-01-01";
  end?: string = "2025-12-31";
  cost?: number = 0.0005;
  is_ratio?: number = 0.7;          // 樣本內占比(線圖分段)
  // walk-forward(預設 holdout,非破壞)
  split_mode?: "holdout" | "walk_forward";
  wf_opt_param?: string;
  wf_opt_values?: number[];
  wf_train_bars?: number; wf_test_bars?: number; wf_step_bars?: number;
}
```

Response:
```ts
{
  strategy; symbol;
  data_source: "cache" | "finmind" | "synthetic";
  from_cache: boolean;
  is_split_index: number;
  metrics: Metrics;                 // 見下
  equity: {time;value}[];           // 權益淨值(起點 1.0)
  benchmark: {time;value}[];        // Buy&Hold
  drawdown: {time;value}[];
  trades: { entry_date; exit_date; entry_price; exit_price; pnl; bars; reason }[];
  walk_forward?: {                  // split_mode=walk_forward 時
    equity; win_rate_by_window; wfe; oos_decay; windows; n_windows; data_source;
  };
}
```

錯誤:未知策略 `404`;引擎錯 `500 {detail}`。

### Metrics(五組)

```
報酬     total_return, cagr
風險     max_drawdown
風險調整  sharpe, sortino, calmar
交易品質  n_trades, win_rate, payoff, expectancy, profit_factor, avg_win, avg_loss,
         win_rate_long/short, n_long/short, max_consec_win/loss,
         win_rate_by_window, pnl_distribution, pnl_edges
對照     benchmark_cagr, alpha_vs_benchmark
旗標     warn_low_sample, warn_high_winrate_neg_exp
```

## POST /sweep

單參數掃描(敏感度)。

Request:
```ts
{ strategy; params?; symbol?="TX"; start?; end?; cost?=0.0005; param: string; values: number[] }
```
→ `{ value, cagr, max_drawdown, sharpe, win_rate, expectancy, profit_factor, n_trades }[]`

## GET /runs?limit=50

回測歷史(SQLite)。
→ `{ input_hash, strategy, symbol, params, created_at, cagr, win_rate, n_trades }[]`

## GET /symbols

可交易標的規格表。
→ `{ id, name, type:"futures"|"stock", point_value, category }[]`
(TX/MTX/TMF 期貨、0050/00631L/2330 股票)

## GET /events?start=&end=

大型市場事件(依區間過濾;省略則回全部)。
→ `{ date, label, category:"crash"|"policy"|"geopolitical"|"other", severity:"high"|"medium" }[]`
