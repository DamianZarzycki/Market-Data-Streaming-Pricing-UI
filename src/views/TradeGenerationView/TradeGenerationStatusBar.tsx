import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";

interface TradeGenerationStatusBarProps {
  isRunning: boolean | null;
  totalGenerated: number | null;
  intervalMs: number | null;
  expectedRatePerSec: number | null;
  loading: boolean;
  onRefresh: () => void;
}

export function TradeGenerationStatusBar({
  isRunning,
  totalGenerated,
  intervalMs,
  expectedRatePerSec,
  loading,
  onRefresh,
}: TradeGenerationStatusBarProps) {
  const running = Boolean(isRunning);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-4 py-3"
      role="region"
      aria-label="Generator worker status"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-text-muted">Generator worker</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-base font-semibold">
            {isRunning == null
              ? "Checking generator status…"
              : running
                ? "Continuous generation is active"
                : "Continuous generation is stopped"}
          </span>
          {isRunning != null ? (
            <StatusPill tone={running ? "live" : "stale"}>
              {running ? "RUNNING" : "STOPPED"}
            </StatusPill>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Metric
          label="GET /status"
          value={
            isRunning == null ? "—" : `is_running: ${String(isRunning)}`
          }
        />
        <Metric
          label="INTERVAL"
          value={intervalMs == null ? "—" : `${intervalMs} ms`}
        />
        <Metric
          label="RATE"
          value={
            expectedRatePerSec == null
              ? "—"
              : running
                ? `~${formatRate(expectedRatePerSec)}/s`
                : "0/s"
          }
        />
        <Metric
          label="TOTAL GENERATED"
          value={
            totalGenerated == null
              ? "—"
              : totalGenerated.toLocaleString("en-US")
          }
        />
      </div>

      <Button variant="secondary" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh status"}
      </Button>
    </div>
  );
}

function formatRate(rate: number): string {
  if (Number.isInteger(rate)) return String(rate);
  return rate.toFixed(2).replace(/\.?0+$/, "");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-text-muted">
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}
