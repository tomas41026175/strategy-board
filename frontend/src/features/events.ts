import type { SeriesMarker, Time } from "lightweight-charts";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface MarketEvent {
  date: string;
  label: string;
  category: "crash" | "policy" | "geopolitical" | "other";
  severity: "high" | "medium";
}

const CATEGORY_COLOR: Record<MarketEvent["category"], string> = {
  crash: "#ef5350",
  policy: "#e0a800",
  geopolitical: "#a371f7",
  other: "#8b949e",
};

export async function fetchEvents(
  start: string,
  end: string
): Promise<MarketEvent[]> {
  const r = await fetch(`${BASE}/events?start=${start}&end=${end}`);
  if (!r.ok) throw new Error(`載入市場事件失敗 (${r.status})`);
  return r.json() as Promise<MarketEvent[]>;
}

export function eventsToMarkers(
  events: MarketEvent[],
  equity: { time: string; value: number }[]
): SeriesMarker<Time>[] {
  if (equity.length === 0) return [];

  const minTime = equity[0].time;
  const maxTime = equity[equity.length - 1].time;

  return events
    .filter((e) => e.date >= minTime && e.date <= maxTime)
    .map(
      (e): SeriesMarker<Time> => ({
        time: e.date as unknown as Time,
        position: "belowBar",
        shape: "circle",
        text: e.label,
        color: CATEGORY_COLOR[e.category],
      })
    );
}
