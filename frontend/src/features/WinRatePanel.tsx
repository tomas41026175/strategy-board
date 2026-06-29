import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import type { Metrics } from "../types";
import { cn, pct } from "../lib/utils";

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-mono text-lg", tone)}>{value}</div>
    </div>
  );
}

export function WinRatePanel({ m }: { m: Metrics }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>勝率分析</CardTitle>
        <span className="text-xs text-muted-foreground">
          勝率須與盈虧比、期望值同看 — 單看勝率會騙人
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 三者強制同框 */}
        <div className="grid grid-cols-4 gap-4">
          <Stat label="勝率" value={pct(m.win_rate)} />
          <Stat label="盈虧比" value={m.payoff.toFixed(2)} />
          <Stat
            label="期望值/筆"
            value={pct(m.expectancy, 2)}
            tone={m.expectancy > 0 ? "text-profit" : "text-loss"}
          />
          <Stat
            label="獲利因子"
            value={m.profit_factor.toFixed(2)}
            tone={m.profit_factor >= 1.5 ? "text-profit" : "text-amber-400"}
          />
        </div>

        {/* 高勝率負期望警示 */}
        {m.warn_high_winrate_neg_exp && (
          <div className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            ⚠️ 高勝率但負期望:小賺大賠,遲早一次吐光,勿信此勝率
          </div>
        )}
        {m.warn_low_sample && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            ⚠️ 交易筆數 &lt; 30,勝率無統計意義,僅供參考
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">多單勝率 </span>
            <span className="font-mono">
              {pct(m.win_rate_long)} ({m.n_long} 筆)
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">最大連勝/連敗 </span>
            <span className="font-mono">
              {m.max_consec_win} / {m.max_consec_loss}
            </span>
          </div>
        </div>

        {/* P&L 分布直方圖:看賺賠形狀(長尾在右=趨勢型;長尾在左=高勝率陷阱) */}
        {m.pnl_distribution.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              P&amp;L 分布(綠=獲利筆 · 紅=虧損筆)
            </div>
            <div className="flex gap-px items-end h-16">
              {m.pnl_distribution.map((count, i) => {
                const max = Math.max(...m.pnl_distribution, 1);
                const center = (m.pnl_edges[i] + m.pnl_edges[i + 1]) / 2;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-t",
                      center >= 0 ? "bg-profit/70" : "bg-loss/70"
                    )}
                    style={{ height: `${(count / max) * 100}%` }}
                    title={`${pct(center, 1)}: ${count} 筆`}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 勝率穩定度(walk-forward 各段;holdout 模式可能為空) */}
        {m.win_rate_by_window.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              勝率穩定度(各樣本外視窗)
            </div>
            <div className="flex gap-1 items-end h-12">
              {m.win_rate_by_window.map((w, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/60 rounded-t"
                  style={{ height: `${w * 100}%` }}
                  title={pct(w)}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
