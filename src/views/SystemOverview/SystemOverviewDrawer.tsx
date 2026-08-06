import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type {
  DerivedServiceCard,
  OverviewEnvironment,
  OverviewKpis,
} from "@/views/SystemOverview/deriveOverview";
import {
  formatClock,
  formatCount,
  formatLatency,
  formatRelative,
} from "@/views/SystemOverview/formatters";

interface SystemOverviewDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  environment: OverviewEnvironment;
  kpis: OverviewKpis;
  attention: DerivedServiceCard[];
  selected: DerivedServiceCard | null;
}

export function SystemOverviewDrawer({
  collapsed,
  onToggleCollapse,
  environment,
  kpis,
  attention,
  selected,
}: SystemOverviewDrawerProps) {
  const navigate = useNavigate();
  const envTone =
    environment.status === "HEALTHY"
      ? "live"
      : environment.status === "DOWN"
        ? "error"
        : "stale";

  if (selected) {
    const health = selected.health;
    const alerts = selected.alerts;
    const vitals: { label: string; value: string; warn?: boolean }[] = [
      { label: "Endpoint", value: selected.catalog.endpointHint },
      {
        label: "Latency",
        value: formatLatency(
          health?.response_time_ms ?? selected.latencyMs,
        ),
      },
      {
        label: "Latency p50",
        value: formatLatency(health?.latency_p50_ms),
      },
      {
        label: "Latency p99",
        value: formatLatency(health?.latency_p99_ms),
      },
      {
        label: "Ticks / min",
        value: formatCount(health?.ticks_per_min),
      },
      {
        label: "Last checked",
        value: selected.lastCheckedAt
          ? `${formatClock(selected.lastCheckedAt)} · ${formatRelative(selected.lastCheckedAt)}`
          : "—",
      },
      {
        label: "Errors (5m)",
        value: formatCount(selected.errors5m),
        warn: selected.errors5m != null && selected.errors5m > 0,
      },
    ];

    return (
      <SideDrawer
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapsedLabel={selected.catalog.label}
        ariaLabel={`${selected.catalog.label} details`}
        title={selected.catalog.label}
        subtitle="Selected service · details"
        trailing={
          <StatusPill tone={selected.tone}>{selected.status}</StatusPill>
        }
      >
        <div className="flex flex-col gap-3.5 px-4 py-3.5">
          <section aria-label="What this means">
            <h3 className="mb-2 text-sm font-semibold">What this means</h3>
            <p className="rounded border border-border bg-surface-alt px-3 py-2.5 text-sm text-text-muted">
              {selected.catalog.whatThisMeans}
            </p>
          </section>

          <section aria-label="Technical vitals">
            <h3 className="mb-2 text-sm font-semibold">Technical vitals</h3>
            <div className="flex flex-col gap-2 rounded border border-border bg-surface-alt px-3 py-2.5">
              {vitals.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-text-muted">{row.label}</span>
                  <span
                    className={
                      row.warn
                        ? "font-mono tabular-nums text-stale"
                        : "font-mono tabular-nums"
                    }
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Recent alerts">
            <h3 className="mb-2 text-sm font-semibold">
              Recent alerts (5 min)
            </h3>
            {alerts.length === 0 ? (
              <div className="rounded border border-border bg-surface-alt px-3 py-3 text-sm text-text-muted">
                No alerts reported yet.
              </div>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {alerts.slice(0, 8).map((alert, index) => {
                  const level = (
                    alert.severity ??
                    alert.level ??
                    "INFO"
                  ).toUpperCase();
                  const tone =
                    level === "ERROR" || level === "FATAL"
                      ? "error"
                      : level === "WARN" || level === "WARNING"
                        ? "stale"
                        : "live";
                  return (
                    <li
                      key={`${alert.message}-${alert.time ?? alert.created_at}-${index}`}
                      className="flex items-start gap-2 rounded border border-border bg-surface-alt px-2.5 py-2"
                    >
                      <StatusPill tone={tone}>{level}</StatusPill>
                      <div className="min-w-0">
                        <p className="text-sm">{alert.message ?? "—"}</p>
                        <p className="font-mono text-[10px] text-text-muted">
                          {formatClock(alert.time ?? alert.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Related views">
            <h3 className="mb-2 text-sm font-semibold">Go to related views</h3>
            <div className="flex flex-col gap-2">
              {selected.catalog.relatedLinks.map((link) => (
                <Button
                  key={link.path + link.label}
                  variant={link.primary ? "primary" : "secondary"}
                  className="w-full justify-center text-sm"
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </SideDrawer>
    );
  }

  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Environment Insights"
      ariaLabel="Environment insights"
      title="Environment Insights"
      subtitle="No service selected"
      trailing={<StatusPill tone={envTone}>{environment.status}</StatusPill>}
    >
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <section aria-label="Needs attention">
          <h3 className="mb-2 text-sm font-semibold">Needs attention</h3>
          {attention.length === 0 ? (
            <div className="rounded border border-border bg-surface-alt px-3 py-3 text-sm text-text-muted">
              No degraded services right now.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {attention.map((card) => (
                <li
                  key={card.id}
                  className="rounded border border-border bg-surface-alt px-3 py-2.5"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <StatusPill tone={card.tone}>{card.status}</StatusPill>
                    <span className="text-sm font-medium">
                      {card.catalog.label}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-text-muted">{card.footer}</p>
                  <Button
                    variant="primary"
                    className="px-2.5 py-1.5 text-sm"
                    onClick={() => navigate(card.catalog.route)}
                  >
                    Open {card.catalog.label} →
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Last 5 minutes">
          <h3 className="mb-2 text-sm font-semibold">Last 5 minutes</h3>
          <div className="flex flex-col gap-2 rounded border border-border bg-surface-alt px-3 py-2.5">
            <StatRow
              label="Total errors"
              value={formatCount(kpis.errors5m)}
              warn={kpis.errors5m != null && kpis.errors5m > 0}
            />
            <StatRow
              label="Services healthy"
              value={`${environment.servicesUp} / ${environment.servicesTotal}`}
            />
            <StatRow
              label="Last market tick"
              value={formatClock(kpis.lastMarketTick)}
              live={Boolean(kpis.lastMarketTick)}
            />
            <StatRow
              label="Last valuation"
              value={formatClock(kpis.lastValuation)}
              live={Boolean(kpis.lastValuation)}
            />
          </div>
        </section>
      </div>
    </SideDrawer>
  );
}

function StatRow({
  label,
  value,
  warn,
  live,
}: {
  label: string;
  value: string;
  warn?: boolean;
  live?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span
        className={
          warn
            ? "font-mono tabular-nums text-stale"
            : live
              ? "font-mono tabular-nums text-live"
              : "font-mono tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
