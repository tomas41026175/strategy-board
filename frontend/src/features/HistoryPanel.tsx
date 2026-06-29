import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { cn, pct } from "../lib/utils";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface RunSummary {
  input_hash: string;
  strategy: string;
  symbol: string;
  params: Record<string, number>;
  created_at: string;
  cagr: number;
  win_rate: number;
  n_trades: number;
}

async function fetchRuns(): Promise<RunSummary[]> {
  const r = await fetch(`${BASE}/runs?limit=50`);
  if (!r.ok) throw new Error(`載入歷史失敗 (${r.status})`);
  return r.json() as Promise<RunSummary[]>;
}

function formatParams(params: Record<string, number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface HistoryPanelProps {
  onLoad: (run: RunSummary) => void;
  refreshKey?: number;
}

export function HistoryPanel({ onLoad, refreshKey }: HistoryPanelProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchRuns()
      .then(setRuns)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "載入失敗")
      )
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>回測歷史</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading && (
          <p className="px-4 py-3 text-sm text-muted-foreground">載入中…</p>
        )}
        {error && (
          <p className="px-4 py-3 text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && runs.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">尚無歷史</p>
        )}
        {!loading && !error && runs.length > 0 && (
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li
                key={run.input_hash}
                onClick={() => onLoad(run)}
                className="px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge>{run.strategy}</Badge>
                    <span className="text-xs text-muted-foreground truncate">
                      {run.symbol}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(run.created_at)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  <span
                    className={cn(
                      "font-medium",
                      run.cagr >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    CAGR {pct(run.cagr)}
                  </span>
                  <span className="text-muted-foreground">
                    勝率 {pct(run.win_rate)}
                  </span>
                  <span className="text-muted-foreground">
                    {run.n_trades} 筆
                  </span>
                </div>
                {Object.keys(run.params).length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground/70 truncate">
                    {formatParams(run.params)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
