import { useEffect, useState } from "react";
import type { SeriesMarker, Time } from "lightweight-charts";
import { getStrategies, runBacktest, type BacktestParams } from "./api/client";
import type { BacktestResponse, StrategyInfo } from "./types";
import { StrategyList } from "./features/StrategyList";
import { StrategyDetail } from "./features/StrategyDetail";
import { SymbolSelector } from "./features/SymbolSelector";
import { MetricsPanel } from "./features/MetricsPanel";
import { WinRatePanel } from "./features/WinRatePanel";
import { EquityChart, DrawdownChart } from "./features/Charts";
import { TradesTable } from "./features/TradesTable";
import { CompareView } from "./features/CompareView";
import { HistoryPanel, type RunSummary } from "./features/HistoryPanel";
import { SweepPanel } from "./features/SweepPanel";
import { Glossary } from "./features/Glossary";
import { fetchEvents, eventsToMarkers } from "./features/events";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { pct, num } from "./lib/utils";

type Status = "idle" | "running" | "done" | "error";

const RANGE = { start: "2018-01-01", end: "2024-12-31" };

export default function App() {
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);
  const [selected, setSelected] = useState<StrategyInfo | null>(null);
  const [symbol, setSymbol] = useState("TX");
  const [params, setParams] = useState<Record<string, number>>({});
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [compared, setCompared] = useState<{ label: string; res: BacktestResponse }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [eventMarkers, setEventMarkers] = useState<SeriesMarker<Time>[]>([]);
  const [showEvents, setShowEvents] = useState(true);

  useEffect(() => {
    getStrategies()
      .then((list) => {
        setStrategies(list);
        if (list[0]) selectStrategy(list[0]);
      })
      .catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectStrategy(s: StrategyInfo) {
    setSelected(s);
    setSymbol(s.default_symbol ?? "TX");
    setParams(Object.fromEntries(s.params.map((p) => [p.name, p.default])));
    setResult(null);
    setStatus("idle");
  }

  async function execute(extra: Partial<BacktestParams> = {}) {
    if (!selected) return;
    setStatus("running");
    setError(null);
    try {
      const res = await runBacktest({
        strategy: selected.id,
        params,
        symbol,
        ...RANGE,
        cost: 0.0005,
        is_ratio: 0.7,
        ...extra,
      });
      setResult(res);
      setStatus("done");
      setRefreshKey((k) => k + 1);
      // 大型事件標記(失敗不影響主結果)
      try {
        const evs = await fetchEvents(RANGE.start, RANGE.end);
        setEventMarkers(eventsToMarkers(evs, res.equity));
      } catch {
        setEventMarkers([]);
      }
    } catch (e) {
      setError(String(e));
      setStatus("error");
    }
  }

  function runWalkForward() {
    if (!selected) return;
    const intParam = selected.params.find((p) => p.type === "int");
    if (!intParam) {
      setError("此策略無 int 參數可做 walk-forward 最佳化");
      return;
    }
    const { min, max } = intParam;
    const values = [0, 1, 2, 3].map((i) =>
      Math.round(min + ((max - min) * i) / 3)
    );
    execute({
      split_mode: "walk_forward",
      wf_opt_param: intParam.name,
      wf_opt_values: Array.from(new Set(values)),
    });
  }

  function handleLoadRun(run: RunSummary) {
    const info = strategies.find((s) => s.name === run.strategy);
    if (!info) return;
    setSelected(info);
    setSymbol(run.symbol ?? info.default_symbol ?? "TX");
    setParams(run.params);
    setResult(null);
    setStatus("idle");
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <span className="font-semibold">⚡ Strategy Board</span>
        <span className="text-xs text-muted-foreground">資料區間 2018–2024</span>
        <div className="ml-auto flex items-center gap-3">
          <Glossary />
          <SymbolSelector value={symbol} onChange={setSymbol} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border p-3 shrink-0 flex flex-col gap-3 overflow-auto">
          <StrategyList
            strategies={strategies}
            selectedId={selected?.id}
            onSelect={selectStrategy}
          />
          <HistoryPanel onLoad={handleLoadRun} refreshKey={refreshKey} />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 space-y-4">
          {error && (
            <div className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
              {error}
            </div>
          )}

          {selected && (
            <StrategyDetail
              strategy={selected}
              params={params}
              onParamChange={(name, value) =>
                setParams((prev) => ({ ...prev, [name]: value }))
              }
              onRun={() => execute()}
              status={status}
              dataSource={result?.data_source}
              fromCache={result?.from_cache}
            />
          )}

          {selected && <SweepPanel strategy={selected} baseParams={params} />}

          {result && (
            <>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCompared((prev) => [
                      ...prev,
                      { label: `${selected!.name} · ${symbol}`, res: result },
                    ])
                  }
                >
                  📌 加入比較
                </Button>
                <Button
                  variant="ghost"
                  onClick={runWalkForward}
                  disabled={status === "running"}
                >
                  🔬 Walk-Forward 驗證
                </Button>
                <label className="ml-2 flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEvents}
                    onChange={(e) => setShowEvents(e.target.checked)}
                  />
                  顯示大型事件
                </label>
              </div>

              <MetricsPanel m={result.metrics} />
              <WinRatePanel m={result.metrics} />

              {result.walk_forward && (
                <Card>
                  <CardHeader className="flex items-center justify-between">
                    <CardTitle>Walk-Forward 驗證</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      每段樣本內最佳化 → 樣本外驗證,模擬真實滾動上線
                    </span>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        WFE 樣本外效率
                      </div>
                      <div className="font-mono text-lg">
                        {num(result.walk_forward.wfe)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        &gt;0.5 較可信
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        樣本外衰退 OOS Decay
                      </div>
                      <div className="font-mono text-lg">
                        {pct(result.walk_forward.oos_decay, 2)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        &lt;30% 穩健
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">視窗數</div>
                      <div className="font-mono text-lg">
                        {result.walk_forward.n_windows}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <EquityChart
                equity={result.equity}
                benchmark={result.benchmark}
                splitIndex={result.is_split_index}
                eventMarkers={showEvents ? eventMarkers : []}
              />
              <DrawdownChart drawdown={result.drawdown} />
              <TradesTable trades={result.trades} />

              <CompareView
                items={compared}
                onRemove={(i) =>
                  setCompared((prev) => prev.filter((_, idx) => idx !== i))
                }
              />
            </>
          )}

          {!result && status !== "running" && selected && (
            <div className="text-sm text-muted-foreground">
              選好標的、調整參數後按 ▶ Run 開始回測。
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
