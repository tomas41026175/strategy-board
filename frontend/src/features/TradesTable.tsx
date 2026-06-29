import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import type { Trade } from "../types";
import { cn, pct } from "../lib/utils";

const reasonLabel: Record<string, string> = {
  signal: "訊號",
  stop: "停損",
  eod: "結算",
};

export function TradesTable({ trades }: { trades: Trade[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>交易明細 ({trades.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm font-mono">
            <thead className="sticky top-0 bg-card text-muted-foreground text-xs">
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2">進場</th>
                <th className="text-left px-3 py-2">出場</th>
                <th className="text-right px-3 py-2">進價</th>
                <th className="text-right px-3 py-2">出價</th>
                <th className="text-right px-3 py-2">P&L</th>
                <th className="text-right px-3 py-2">持倉</th>
                <th className="text-center px-3 py-2">出場因</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-3 py-1.5">{t.entry_date}</td>
                  <td className="px-3 py-1.5">{t.exit_date}</td>
                  <td className="text-right px-3 py-1.5">{t.entry_price}</td>
                  <td className="text-right px-3 py-1.5">{t.exit_price}</td>
                  <td
                    className={cn(
                      "text-right px-3 py-1.5",
                      t.pnl > 0 ? "text-profit" : "text-loss"
                    )}
                  >
                    {pct(t.pnl, 2)}
                  </td>
                  <td className="text-right px-3 py-1.5">{t.bars}d</td>
                  <td className="text-center px-3 py-1.5 text-muted-foreground">
                    {reasonLabel[t.reason] ?? t.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
