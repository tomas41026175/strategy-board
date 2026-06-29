import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { StrategyInfo } from "../types";

export function StrategyDetail({
  strategy,
  params,
  onParamChange,
  onRun,
  status,
  dataSource,
  fromCache,
}: {
  strategy: StrategyInfo;
  params: Record<string, number>;
  onParamChange: (name: string, value: number) => void;
  onRun: () => void;
  status: "idle" | "running" | "done" | "error";
  dataSource?: string;
  fromCache?: boolean;
}) {
  const statusBadge = {
    idle: <Badge>待執行</Badge>,
    running: <Badge className="bg-amber-500/15 text-amber-400">回測中…</Badge>,
    done: <Badge className="bg-profit/15 text-profit">✓ 完成</Badge>,
    error: <Badge className="bg-loss/15 text-loss">✗ 錯誤</Badge>,
  }[status];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>{strategy.name}</CardTitle>
          <Badge tone={strategy.category}>{strategy.category}</Badge>
          {dataSource && (
            <span className="text-xs text-muted-foreground">
              資料源: {dataSource}
              {dataSource === "synthetic" && "(合成)"}
            </span>
          )}
          {fromCache && (
            <Badge className="bg-primary/15 text-primary">⚡ 快取</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Button onClick={onRun} disabled={status === "running"}>
            ▶ Run
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {strategy.description}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategy.params.map((p) => (
            <div key={p.name}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{p.label}</span>
                <span className="font-mono">{params[p.name] ?? p.default}</span>
              </div>
              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={params[p.name] ?? p.default}
                onChange={(e) =>
                  onParamChange(p.name, Number(e.target.value))
                }
                className="w-full accent-[var(--primary)]"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
