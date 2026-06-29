export interface ParamSpec {
  name: string;
  type: "int" | "float";
  default: number;
  min: number;
  max: number;
  step: number;
  label: string;
}

export interface StrategyInfo {
  id: string;
  name: string;
  category: "trend" | "meanrev" | "intraday";
  description: string;
  default_symbol: string;
  params: ParamSpec[];
}

export interface SeriesPoint {
  time: string;
  value: number;
}

export interface Metrics {
  total_return: number;
  cagr: number;
  max_drawdown: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  n_trades: number;
  win_rate: number;
  payoff: number;
  expectancy: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  win_rate_long: number;
  n_long: number;
  win_rate_short: number;
  n_short: number;
  max_consec_win: number;
  max_consec_loss: number;
  win_rate_by_window: number[];
  pnl_distribution: number[];
  pnl_edges: number[];
  benchmark_cagr: number;
  alpha_vs_benchmark: number;
  warn_low_sample: boolean;
  warn_high_winrate_neg_exp: boolean;
  // 防呆:指標統計範圍。metrics 永遠是「全期 in-sample」;
  // 樣本外結果在 walk_forward 區塊,wf 模式時 oos_summary 提供對照。
  scope?: "full_in_sample" | "full_in_sample_with_oos";
  oos_summary?: {
    total_return: number | null;
    wfe: number;
    oos_decay: number;
    n_windows: number;
  };
}

export interface Trade {
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  bars: number;
  reason: string;
}

export interface WalkForwardWindow {
  start: string;
  end: string;
  param: string;
  value: number;
  win_rate: number;
}

export interface WalkForward {
  equity: SeriesPoint[];
  win_rate_by_window: number[];
  wfe: number;
  oos_decay: number;
  windows: WalkForwardWindow[];
  n_windows: number;
  data_source: string;
}

export interface BacktestResponse {
  strategy: string;
  symbol: string;
  data_source: string;
  from_cache?: boolean;
  is_split_index: number;
  metrics: Metrics;
  equity: SeriesPoint[];
  benchmark: SeriesPoint[];
  drawdown: SeriesPoint[];
  trades: Trade[];
  walk_forward?: WalkForward;
}
