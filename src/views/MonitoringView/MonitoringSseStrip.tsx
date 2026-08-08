import { cn } from "@/lib/cn";
import type { SseStripModel } from "@/views/MonitoringView/deriveMonitoring";
import { ProbeStatusPill } from "@/views/MonitoringView/ProbeStatusPill";

interface MonitoringSseStripProps {
  strip: SseStripModel;
}

export function MonitoringSseStrip({ strip }: MonitoringSseStripProps) {
  const allUp = strip.upCount === strip.total && strip.total > 0;
  const fillTone = allUp ? "bg-live" : strip.upCount === 0 ? "bg-error" : "bg-stale";

  return (
    <section
      className="shrink-0 border-b border-border px-4 py-3"
      aria-label="SSE connection status"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">SSE connection status</h2>
        <p className="text-sm text-text-muted">
          Inferred from health probes of stream-owning services
        </p>
      </div>

      <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
          <span
            className={cn(
              "font-mono tabular-nums font-medium",
              allUp ? "text-live" : "text-error",
            )}
          >
            {strip.upCount} / {strip.total} stream owners UP
          </span>
          {strip.owners.map((owner) => (
            <span
              key={owner.key}
              className="inline-flex items-center gap-2 font-mono text-sm"
            >
              <span className="text-text-muted">{owner.label}</span>
              <ProbeStatusPill status={owner.status} />
            </span>
          ))}
        </div>

        <div
          className="h-2 overflow-hidden rounded bg-border"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={strip.fillPct}
          aria-label="Stream owners healthy percentage"
        >
          <div
            className={cn(
              "h-full rounded transition-[width] duration-300",
              fillTone,
            )}
            style={{ width: `${Math.min(100, Math.max(0, strip.fillPct))}%` }}
          />
        </div>
      </div>
    </section>
  );
}
