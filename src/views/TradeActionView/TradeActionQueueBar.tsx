import { cn } from "@/lib/cn";
import type { TradeActionQueue } from "@/services/tradeActionTypes";
import { formatCount } from "@/views/TradeActionView/formatters";

interface TradeActionQueueBarProps {
  queue: TradeActionQueue | null;
}

export function TradeActionQueueBar({ queue }: TradeActionQueueBarProps) {
  const fill = queue?.fill_pct ?? 0;
  const backpressure = Boolean(queue?.backpressure);
  const fillTone =
    fill >= 70 ? "bg-error" : fill >= 40 ? "bg-stale" : "bg-live";

  return (
    <section
      className="shrink-0 border-b border-border px-4 py-3"
      aria-label="Queue buffer status"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Queue / buffer status</h2>
        <p className="text-sm text-text-muted">
          in-memory queue.Queue · put(block=False) → 503 when full
        </p>
      </div>

      <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
        <div className="mb-2 flex flex-wrap gap-6 text-sm">
          <span className="font-mono tabular-nums">
            Depth{"  "}
            {queue ? formatCount(queue.depth) : "—"}
          </span>
          <span className="font-mono tabular-nums text-text-muted">
            Capacity{"  "}
            {queue ? formatCount(queue.capacity) : "—"}
          </span>
          <span
            className={cn(
              "font-mono tabular-nums",
              fill >= 70 ? "text-error" : "text-live",
            )}
          >
            Fill{"  "}
            {queue ? `${fill}%` : "—"}
          </span>
          <span
            className={cn(
              "font-medium",
              backpressure ? "text-error" : "text-live",
            )}
          >
            Backpressure{"  "}
            {queue == null ? "—" : backpressure ? "ON" : "OFF"}
          </span>
        </div>

        <div
          className="h-2 overflow-hidden rounded bg-border"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fill}
          aria-label="Queue fill percentage"
        >
          <div
            className={cn("h-full rounded transition-[width] duration-300", fillTone)}
            style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
          />
        </div>
      </div>
    </section>
  );
}
