import { cn } from "@/lib/cn";

interface SummaryBarProps {
  label: string;
  value: string | null;
  empty: string;
}

export function SummaryBar({ label, value, empty }: SummaryBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded border px-4 py-3",
        value != null
          ? "border-accent-strong bg-accent/10"
          : "border-border bg-surface-alt",
      )}
    >
      <span className="text-sm font-semibold uppercase tracking-[0.03em] text-text-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xl font-semibold tabular-nums",
          value != null ? "text-text" : "text-text-muted text-base",
        )}
      >
        {value ?? empty}
      </span>
    </div>
  );
}
