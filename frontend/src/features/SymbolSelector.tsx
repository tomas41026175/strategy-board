import { useState, useEffect } from "react";
import { cn } from "../lib/utils";

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface SymbolInfo {
  id: string;
  name: string;
  type: "futures" | "stock";
  point_value: number;
  category: string;
}

async function fetchSymbols(): Promise<SymbolInfo[]> {
  const r = await fetch(`${BASE}/symbols`);
  if (!r.ok) throw new Error(`載入標的失敗 (${r.status})`);
  return r.json() as Promise<SymbolInfo[]>;
}

interface SymbolSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function SymbolSelector({ value, onChange }: SymbolSelectorProps) {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSymbols()
      .then(setSymbols)
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "載入標的失敗");
      });
  }, []);

  const selected = symbols.find((s) => s.id === value) ?? null;

  const groups = symbols.reduce<Record<string, SymbolInfo[]>>((acc, s) => {
    const key = s.category;
    return { ...acc, [key]: [...(acc[key] ?? []), s] };
  }, {});

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={symbols.length === 0 && error === null}
        className={cn(
          "rounded border border-border bg-muted text-sm px-2 py-1",
          "focus:outline-none focus:ring-1 focus:ring-border",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        style={{ fontSize: 16 }} /* iOS zoom 防護：font-size < 16px 聚焦時自動放大 */
      >
        {error !== null && (
          <option value="" disabled>
            {error}
          </option>
        )}
        {Object.entries(groups).map(([category, items]) => (
          <optgroup key={category} label={category}>
            {items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selected !== null && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {selected.type === "futures"
            ? `每點 ${selected.point_value} 元`
            : "現股"}
        </span>
      )}
    </div>
  );
}
