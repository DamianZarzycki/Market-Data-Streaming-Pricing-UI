import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type {
  EnvironmentRollup,
  MonitoringKpis,
} from "@/views/MonitoringView/deriveMonitoring";
import {
  formatCount,
  formatLatency,
} from "@/views/MonitoringView/formatters";

interface MonitoringStatusBarProps {
  rollup: EnvironmentRollup;
  kpis: MonitoringKpis;
  serviceUp: boolean | null;
  loading: boolean;
  onRefresh: () => void;
}

export function MonitoringStatusBar({
  rollup,
  kpis,
  serviceUp,
  loading,
  onRefresh,
}: MonitoringStatusBarProps) {
  const degraded = rollup === "DEGRADED";
  const tone =
    rollup === "HEALTHY" ? "live" : rollup === "DEGRADED" ? "stale" : "stale";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-4 py-3"
      role="region"
      aria-label="Monitoring status"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-text-muted">MONITORING</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill tone={tone}>{rollup}</StatusPill>
          <span className="font-mono text-sm tabular-nums text-text-muted">
            UP{" "}
            <span className={degraded ? "text-live" : "text-text"}>
              {formatCount(kpis.servicesUp)} / {formatCount(kpis.servicesTotal)}
            </span>
          </span>
          <span className="font-mono text-sm tabular-nums text-text-muted">
            DOWN{" "}
            <span className={kpis.downCount > 0 ? "text-error" : "text-text"}>
              {formatCount(kpis.downCount)}
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Metric
          label="AVG LATENCY"
          value={formatLatency(kpis.avgLatencyMs)}
        />
        <Metric
          label="PROBE ERRORS"
          value={formatCount(kpis.probeErrors)}
          valueClassName={kpis.probeErrors > 0 ? "text-error" : undefined}
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
