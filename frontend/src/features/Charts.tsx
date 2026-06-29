import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import type { SeriesPoint } from "../types";

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

export function EquityChart({
  equity,
  benchmark,
  splitIndex,
  eventMarkers = [],
}: {
  equity: SeriesPoint[];
  benchmark: SeriesPoint[];
  splitIndex: number;
  eventMarkers?: SeriesMarker<Time>[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart: IChartApi = createChart(ref.current, {
      ...baseOptions,
      height: 280,
    });

    // 切兩段:樣本內(灰)/ 樣本外(綠);邊界重疊一點保持連續
    const isData = equity.slice(0, Math.max(1, splitIndex + 1));
    const oosData = equity.slice(splitIndex);

    const isSeries = chart.addLineSeries({
      color: "#8b949e",
      lineWidth: 2,
      title: "樣本內 (IS)",
    });
    isSeries.setData(isData as never);

    const oosSeries = chart.addLineSeries({
      color: "#26a69a",
      lineWidth: 2,
      title: "樣本外 (OOS)",
    });
    oosSeries.setData(oosData as never);

    const bh = chart.addLineSeries({
      color: "#58606a",
      lineWidth: 1,
      lineStyle: 2,
      title: "Buy&Hold",
    });
    bh.setData(benchmark as never);

    // OOS 起點標記 + 大型事件標記:合併成一次 setMarkers(同 series 只能設一次),依時間排序
    const splitDate = equity[splitIndex]?.time;
    const oosMarker: SeriesMarker<Time>[] = splitDate
      ? [
          {
            time: splitDate as Time,
            position: "aboveBar",
            color: "#2563eb",
            shape: "arrowDown",
            text: "OOS 起點",
          },
        ]
      : [];
    const allMarkers = [...oosMarker, ...eventMarkers].sort((a, b) =>
      a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    );
    if (allMarkers.length) oosSeries.setMarkers(allMarkers);

    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [equity, benchmark, splitIndex, eventMarkers]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>權益曲線 vs Buy&Hold</CardTitle>
        <span className="text-xs text-muted-foreground">
          灰=樣本內 · 綠=樣本外 · 虛線=Buy&Hold
        </span>
      </CardHeader>
      <CardContent>
        <div ref={ref} />
      </CardContent>
    </Card>
  );
}

export function DrawdownChart({ drawdown }: { drawdown: SeriesPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, { ...baseOptions, height: 160 });
    const dd = chart.addAreaSeries({
      lineColor: "#ef5350",
      topColor: "rgba(239,83,80,0.4)",
      bottomColor: "rgba(239,83,80,0.05)",
      lineWidth: 1,
    });
    dd.setData(drawdown as never);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [drawdown]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>回撤 (Drawdown)</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={ref} />
      </CardContent>
    </Card>
  );
}
