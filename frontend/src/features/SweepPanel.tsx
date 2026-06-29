import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { cn, num, pct } from "../lib/utils";
import type { ParamSpec, StrategyInfo } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SweepPoint {
  value: number;
  cagr: number;
  max_drawdown: number;
  sharpe: number;
  win_rate: number;
  expectancy: number;
  profit_factor: number;
  n_trades: number;
}

type SweepMetric = "expectancy" | "cagr" | "sharpe" | "profit_factor";

interface SweepBody {
  strategy: string;
  params: Record<string, number>;
  symbol: string;
  start: string;
  end: string;
  cost: number;
  param: string;
  values: number[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function runSweep(body: SweepBody): Promise<SweepPoint[]> {
  const r = await fetch(`${BASE}/sweep`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ?? `掃描失敗 (${r.status})`
    );
  }
  return r.json() as Promise<SweepPoint[]>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateValues(spec: ParamSpec, count = 12): number[] {
  if (spec.max <= spec.min || count <= 1) return [spec.min];
  const raw = Array.from({ length: count }, (_, i) => {
    const v = spec.min + ((spec.max - spec.min) * i) / (count - 1);
    return spec.type === "int" ? Math.round(v) : parseFloat(v.toFixed(6));
  });
  // deduplicate while preserving order (int types with narrow ranges)
  return [...new Set(raw)];
}

const METRIC_LABELS: Record<SweepMetric, string> = {
  expectancy: "期望值",
  cagr: "年化報酬 CAGR",
  sharpe: "夏普值 Sharpe",
  profit_factor: "獲利因子",
};

function formatMetric(metric: SweepMetric, v: number): string {
  return metric === "expectancy" || metric === "cagr" ? pct(v, 2) : num(v);
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const CHART_H = 128; // px (≈ h-32)

interface SweepChartProps {
  results: SweepPoint[];
  metric: SweepMetric;
}

function SweepChart({ results, metric }: SweepChartProps) {
  const values = results.map((r) => r[metric]);
  const maxPos = Math.max(...values.filter((v) => v > 0), 0);
  const maxNegAbs = Math.abs(Math.min(...values.filter((v) => v < 0), 0));
  const totalRange = maxPos + maxNegAbs || 1;

  // topH: height allocated to the positive space (above center line)
  // botH: height allocated to the negative space (below center line)
  const topH = (maxPos / totalRange) * CHART_H;
  const botH = CHART_H - topH;
  const hasMixed = maxPos > 0 && maxNegAbs > 0;

  return (
    <div>
      {/* Chart area */}
      <div className="relative" style={{ height: CHART_H }}>
        {/* Center line — only visible when positive and negative values coexist */}
        {hasMixed && (
          <div
            className="absolute left-0 right-0 bg-border"
            style={{ top: topH, height: 1 }}
          />
        )}

        <div className="flex gap-px h-full">
          {results.map((pt, i) => {
            const v = pt[metric];
            const barH =
              v > 0 && maxPos > 0
                ? (v / maxPos) * topH
                : v < 0 && maxNegAbs > 0
                ? (Math.abs(v) / maxNegAbs) * botH
                : 0;

            return (
              <div
                key={i}
                className="relative flex-1"
                title={`${pt.value}: ${formatMetric(metric, v)}`}
              >
                {barH > 0 && (
                  <div
                    className={cn(
                      "absolute left-0 right-0 transition-colors cursor-default",
                      v > 0
                        ? "rounded-t bg-profit/70 hover:bg-profit"
                        : "rounded-b bg-loss/70 hover:bg-loss"
                    )}
                    style={
                      v > 0
                        ? // Positive bar: bottom edge anchored at center, grows upward
                          { bottom: CHART_H - topH, height: Math.max(barH, 2) }
                        : // Negative bar: top edge anchored at center, grows downward
                          { top: topH + 1, height: Math.max(barH, 2) }
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="flex gap-px mt-1">
        {results.map((pt, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[10px] text-muted-foreground truncate leading-none"
          >
            {pt.value}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function SweepPanel({
  strategy,
  baseParams,
}: {
  strategy: StrategyInfo;
  baseParams: Record<string, number>;
}) {
  const numericParams = strategy.params.filter(
    (p) => p.type === "int" || p.type === "float"
  );

  const [selectedParam, setSelectedParam] = useState<string>(
    numericParams[0]?.name ?? ""
  );
  const [metric, setMetric] = useState<SweepMetric>("expectancy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SweepPoint[] | null>(null);

  const paramSpec = numericParams.find((p) => p.name === selectedParam);

  const handleSweep = async () => {
    if (!paramSpec) return;
    const values = generateValues(paramSpec, 12);
    setLoading(true);
    setError(null);
    try {
      const data = await runSweep({
        strategy: strategy.id,
        params: baseParams,
        symbol: "TX",
        start: "2018-01-01",
        end: "2024-12-31",
        cost: 0.0005,
        param: selectedParam,
        values,
      });
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  if (numericParams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>參數敏感度掃描</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            此策略無可掃描的數值型參數
          </p>
        </CardContent>
      </Card>
    );
  }

  const metricValues = results?.map((r) => r[metric]) ?? [];
  const maxV = metricValues.length > 0 ? Math.max(...metricValues) : null;
  const minV = metricValues.length > 0 ? Math.min(...metricValues) : null;
  const bestPt = maxV !== null ? results?.find((r) => r[metric] === maxV) : null;
  const worstPt = minV !== null ? results?.find((r) => r[metric] === minV) : null;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>參數敏感度掃描</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* ── Controls ── */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">掃描參數</label>
            <select
              className="rounded-md border border-border bg-card text-foreground text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              value={selectedParam}
              onChange={(e) => {
                setSelectedParam(e.target.value);
                setResults(null);
                setError(null);
              }}
            >
              {numericParams.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.label}（{p.min} ～ {p.max}）
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">觀察指標</label>
            <div className="flex gap-1 flex-wrap">
              {(Object.keys(METRIC_LABELS) as SweepMetric[]).map((m) => (
                <Button
                  key={m}
                  variant={metric === m ? "primary" : "ghost"}
                  className="text-xs px-2 py-1"
                  onClick={() => setMetric(m)}
                >
                  {METRIC_LABELS[m]}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSweep}
            disabled={loading || !paramSpec}
            className="self-end"
          >
            {loading ? "掃描中…" : "掃描"}
          </Button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </div>
        )}

        {/* ── Chart ── */}
        {results && results.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {METRIC_LABELS[metric]} vs {paramSpec?.label ?? selectedParam}
              （{results.length} 點均勻取樣）
            </div>

            <SweepChart results={results} metric={metric} />

            {/* Summary stats row */}
            {maxV !== null && minV !== null && bestPt && worstPt && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">最佳 </span>
                  <span className="font-mono text-profit">
                    {formatMetric(metric, maxV)}
                    {" @ "}
                    {bestPt.value}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">最差 </span>
                  <span className="font-mono text-loss">
                    {formatMetric(metric, minV)}
                    {" @ "}
                    {worstPt.value}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">波動幅度 </span>
                  <span className="font-mono">
                    {formatMetric(metric, maxV - minV)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Interpretation hint ── */}
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          對參數鈍感（各值績效接近）= 較穩健；劇烈跳動 = 可能過擬合，參數對樣本外資料敏感
        </div>

      </CardContent>
    </Card>
  );
}
