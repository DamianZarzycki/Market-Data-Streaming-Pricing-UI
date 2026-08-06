import { cn } from "@/lib/cn";
import type { TradeActionStatus } from "@/services/tradeActionTypes";
import {
  formatCount,
  formatLatency,
} from "@/views/TradeActionView/formatters";

interface TradeActionKpiStripProps {
  status: TradeActionStatus | null;
}

interface Kpi {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}

export function TradeActionKpiStrip({ status }: TradeActionKpiStripProps) {
  const items: Kpi[] = [
    {
      label: "PROCESSED",
      value: formatCount(status?.processed),
      hint: "worker commits",
    },
    {
      label: "ERRORS",
      value: formatCount(status?.errors),
      hint: "handler / DB failures",
      valueClassName:
        status && status.errors > 0 ? "text-error" : undefined,
    },
    {
      label: "AVG LATENCY",
      value: formatLatency(status?.avg_latency_ms),
      hint: "enqueue → commit",
      valueClassName:
        status?.avg_latency_ms != null ? "text-live" : undefined,
    },
    {
      label: "REJECTED 400",
      value: formatCount(status?.rejected_400),
      hint: "validation",
      valueClassName:
        status && status.rejected_400 > 0 ? "text-stale" : undefined,
    },
    {
      label: "OVERLOAD 503",
      value: formatCount(status?.overload_503),
      hint: "queue full",
      valueClassName:
        status && status.overload_503 > 0 ? "text-error" : "text-live",
    },
    {
      label: "DUPLICATES",
      value: formatCount(status?.duplicates),
      hint: "idempotency skip",
    },
  ];

  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-4 py-3 min-[900px]:grid-cols-3 min-[1200px]:grid-cols-6"
      role="region"
      aria-label="Trade action KPIs"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 rounded border border-border bg-surface px-3 py-2.5"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-text-muted">
            {item.label}
          </span>
          <span
            className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              item.valueClassName,
            )}
          >
            {item.value}
          </span>
          <span className="text-[10px] text-text-muted">{item.hint}</span>
        </div>
      ))}
    </div>
  );
}
