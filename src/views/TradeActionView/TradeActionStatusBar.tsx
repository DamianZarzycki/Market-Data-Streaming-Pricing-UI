import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { TradeActionStatus } from "@/services/tradeActionTypes";
import { formatCount } from "@/views/TradeActionView/formatters";

interface TradeActionStatusBarProps {
  status: TradeActionStatus | null;
  serviceUp: boolean | null;
  loading: boolean;
  onRefresh: () => void;
}

export function TradeActionStatusBar({
  status,
  serviceUp,
  loading,
  onRefresh,
}: TradeActionStatusBarProps) {
  const pipeline = status?.pipeline_status ?? null;
  const pressure = pipeline === "PRESSURE";
  const queue = status?.queue;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-4 py-3"
      role="region"
      aria-label="Processing pipeline status"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-text-muted">Processing pipeline</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-sm tabular-nums text-text">
            Accept → queue → worker → DB
          </span>
          {pipeline ? (
            <StatusPill tone={pressure ? "stale" : "live"}>
              {pipeline}
            </StatusPill>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Metric
          label="QUEUE"
          value={
            queue
              ? `${formatCount(queue.depth)} / ${formatCount(queue.capacity)}`
              : "—"
          }
        />
        <Metric
          label="THROUGHPUT"
          value={
            status
              ? `${formatCount(status.throughput_per_min)} / min`
              : "—"
          }
          valueClassName={
            status && status.throughput_per_min > 0 ? "text-live" : undefined
          }
        />
        <Metric
          label="WORKER"
          value={
            status == null
              ? "—"
              : status.worker_running
                ? "RUNNING"
                : "STOPPED"
          }
          valueClassName={
            status?.worker_running ? "text-live" : "text-stale"
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
        <StatusPill
          tone={
            serviceUp == null ? "stale" : serviceUp ? "live" : "error"
          }
          title="GET /health"
        >
          GET /health{" "}
          {serviceUp == null ? "…" : serviceUp ? "UP" : "DOWN"}
        </StatusPill>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-text-muted">
        {label}
      </span>
      <span
        className={`font-mono text-sm tabular-nums ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
