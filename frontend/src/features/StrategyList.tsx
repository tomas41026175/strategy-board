import { useMemo, useState } from "react";
import type { StrategyInfo } from "../types";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

const categoryLabel: Record<string, string> = {
  trend: "趨勢",
  meanrev: "均值回歸",
  intraday: "當沖",
};

export function StrategyList({
  strategies,
  selectedId,
  onSelect,
}: {
  strategies: StrategyInfo[];
  selectedId?: string;
  onSelect: (s: StrategyInfo) => void;
}) {
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const filtered = strategies.filter(
      (s) => s.name.includes(q) || s.description.includes(q)
    );
    const map: Record<string, StrategyInfo[]> = {};
    for (const s of filtered) (map[s.category] ??= []).push(s);
    return map;
  }, [strategies, q]);

  return (
    <div className="flex flex-col h-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜尋策略..."
        className="w-full bg-muted rounded-md px-3 py-2 text-sm outline-none border border-border focus:border-primary"
        style={{ fontSize: 16 }}
      />
      <div className="mt-3 space-y-3 overflow-auto flex-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="text-xs text-muted-foreground uppercase mb-1 px-1">
              {categoryLabel[cat] ?? cat}
            </div>
            {items.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                  selectedId === s.id ? "bg-primary/15 text-foreground" : "hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    selectedId === s.id ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                />
                <span className="flex-1">{s.name}</span>
                <Badge tone={s.category}>{categoryLabel[s.category]}</Badge>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
