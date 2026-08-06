import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { OverviewEnvironment } from "@/views/SystemOverview/deriveOverview";
import { formatRelative } from "@/views/SystemOverview/formatters";

interface SystemOverviewStatusBarProps {
  environment: OverviewEnvironment;
  lastRefreshAt: string | null;
  loading: boolean;
  onRefresh: () => void;
}

export function SystemOverviewStatusBar({
  environment,
  lastRefreshAt,
  loading,
  onRefresh,
}: SystemOverviewStatusBarProps) {
  const tone =
    environment.status === "HEALTHY"
      ? "live"
      : environment.status === "DOWN"
        ? "error"
        : "stale";

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded border border-border bg-surface px-4 py-3"
      role="region"
      aria-label="Environment status"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-text-muted">Environment status</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium text-text">
            {environment.message}
          </span>
          <StatusPill tone={tone}>{environment.status}</StatusPill>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <Metric
          label="SERVICES UP"
          value={`${environment.servicesUp} / ${environment.servicesTotal}`}
        />
        <Metric
          label="LAST REFRESH"
          value={formatRelative(lastRefreshAt)}
        />
        <Metric label="DATA WINDOW" value={environment.dataWindow} />
      </div>

      <Button variant="secondary" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
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
