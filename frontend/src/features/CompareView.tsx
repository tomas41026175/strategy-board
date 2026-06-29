import { useEffect, useRef } from "react";
import { createChart, ColorType, IChartApi } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import type { BacktestResponse } from "../types";
import { pct, num } from "../lib/utils";

const baseOptions = {
  layout: {
    background: { type: ColorType.Solid, color: "transparent" },
    textColor: "#8b949e",
  },
  grid: {
    vertLines: { color: "#21262d" },
    horzLines: { color: "#21262d" },
  },
  rightPriceScale: { borderColor: "#30363d" },
  timeScale: { borderColor: "#30363d" },
  autoSize: true,
};

const SERIES_COLORS = ["#26a69a", "#2563eb", "#e0a800", "#a371f7", "#ef5350"];

interface RowDef {
  label: string;
  format: (res: BacktestResponse) => string;
  colorClass?: (res: BacktestResponse) => string;
}

const KPI_ROWS: RowDef[] = [
  {
    label: "CAGR",
    format: (r) => pct(r.metrics.cagr),
    colorClass: (r) => (r.metrics.cagr >= 0 ? "text-profit" : "text-loss"),
  },
  {
    label: "最大回撤",
    format: (r) => pct(r.metrics.max_drawdown),
    colorClass: () => "text-loss",
  },
  {
    label: "Sharpe",
    format: (r) => num(r.metrics.sharpe),
  },
  {
    label: "勝率",
    format: (r) => pct(r.metrics.win_rate),
  },
  {
    label: "盈虧比 (Payoff)",
    format: (r) => num(r.metrics.payoff),
  },
  {
    label: "期望值",
    format: (r) => pct(r.metrics.expectancy),
    colorClass: (r) => (r.metrics.expectancy >= 0 ? "text-profit" : "text-loss"),
  },
  {
    label: "獲利因子",
    format: (r) => num(r.metrics.profit_factor),
  },
  {
    label: "交易筆數",
    format: (r) => String(r.metrics.n_trades),
  },
];

function OverlayChart({ items }: { items: { label: string; res: BacktestResponse }[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart: IChartApi = createChart(ref.current, {
      ...baseOptions,
      height: 280,
    });

    items.forEach((item, i) => {
      const color = SERIES_COLORS[i % SERIES_COLORS.length];
      const series = chart.addLineSeries({
        color,
        lineWidth: 2,
        title: item.label,
      });
      series.setData(item.res.equity as never);
    });

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [items]);

  return <div ref={ref} />;
}

export function CompareView({
  items,
  onRemove,
}: {
  items: { label: string; res: BacktestResponse }[];
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>策略比較</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* KPI 並排表 */}
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-4 text-left text-muted-foreground font-normal">
                  指標
                </th>
                {items.map((item, i) => (
                  <th key={i} className="py-2 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                      />
                      <span>{item.label}</span>
                      <button
                        onClick={() => onRemove(i)}
                        className="text-muted-foreground hover:text-foreground leading-none ml-0.5"
                        aria-label={`移除 ${item.label}`}
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KPI_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="py-2 px-4 text-muted-foreground">{row.label}</td>
                  {items.map((item, i) => (
                    <td
                      key={i}
                      className={`py-2 px-4 text-center ${
                        row.colorClass ? row.colorClass(item.res) : ""
                      }`}
                    >
                      {row.format(item.res)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 權益曲線疊圖 */}
        <div className="px-4 pb-4 pt-2">
          <OverlayChart items={items} />
        </div>
      </CardContent>
    </Card>
  );
}
