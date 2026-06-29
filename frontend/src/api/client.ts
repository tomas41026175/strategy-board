import type { BacktestResponse, StrategyInfo } from "../types";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function getStrategies(): Promise<StrategyInfo[]> {
  const r = await fetch(`${BASE}/strategies`);
  if (!r.ok) throw new Error(`載入策略失敗 (${r.status})`);
  return r.json();
}

export interface BacktestParams {
  strategy: string;
  params: Record<string, number>;
  symbol: string;
  start: string;
  end: string;
  cost: number;
  is_ratio: number;
  split_mode?: string;
  wf_opt_param?: string;
  wf_opt_values?: number[];
}

export async function runBacktest(
  req: BacktestParams
): Promise<BacktestResponse> {
  const r = await fetch(`${BASE}/backtest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error(detail.detail ?? `回測失敗 (${r.status})`);
  }
  return r.json();
}
