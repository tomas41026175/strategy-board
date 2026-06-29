import { cn } from "../../lib/utils";

const categoryColor: Record<string, string> = {
  trend: "bg-blue-500/15 text-blue-400",
  meanrev: "bg-purple-500/15 text-purple-400",
  intraday: "bg-amber-500/15 text-amber-400",
};

export function Badge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        tone ? categoryColor[tone] ?? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
