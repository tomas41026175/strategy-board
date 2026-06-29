import { Card } from "../components/ui/card";
import type { Metrics } from "../types";
import { cn, pct, num } from "../lib/utils";

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "profit" | "loss" | "warn" | "neutral";
}) {
  return (
    <Card className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-mono text-2xl mt-1",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
          tone === "warn" && "text-amber-400"
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

export function MetricsPanel({ m }: { m: Metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Tile
        label="年化報酬 CAGR"
        value={pct(m.cagr)}
        sub={`vs 買進持有 ${pct(m.benchmark_cagr)}`}
        tone={m.alpha_vs_benchmark > 0 ? "profit" : "loss"}
      />
      <Tile label="最大回撤" value={pct(m.max_drawdown)} tone="loss" />
      <Tile
        label="夏普值 Sharpe"
        value={num(m.sharpe)}
        sub={`報酬回撤 Calmar ${num(m.calmar)}`}
        tone={m.sharpe >= 1 ? "profit" : "neutral"}
      />
      <Tile
        label="勝率"
        value={pct(m.win_rate)}
        sub={`${m.n_trades} 筆`}
        tone={m.warn_low_sample ? "warn" : "neutral"}
      />
      <Tile
        label="獲利因子"
        value={num(m.profit_factor)}
        sub={m.profit_factor >= 1.5 ? "健康" : "偏低"}
        tone={m.profit_factor >= 1.5 ? "profit" : "warn"}
      />
    </div>
  );
}
