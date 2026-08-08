import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type {
  ProbeRow,
  StatusTransition,
  StreamOwner,
} from "@/views/MonitoringView/deriveMonitoring";
import {
  portHint,
  whatThisMeansCopy,
} from "@/views/MonitoringView/deriveMonitoring";
import {
  formatClock,
  formatLatency,
} from "@/views/MonitoringView/formatters";
import { ProbeStatusPill } from "@/views/MonitoringView/ProbeStatusPill";

interface MonitoringDrawerProps {
  row: ProbeRow | null;
  relatedStreams: StreamOwner[];
  history: StatusTransition[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const API_MAP = [
  "GET /health",
  "GET /status → health_cache",
  "Probes → 6 × */health",
  "Interval → 1s",
] as const;

export function MonitoringDrawer({
  row,
  relatedStreams,
  history,
  collapsed,
  onToggleCollapse,
}: MonitoringDrawerProps) {
  const means = whatThisMeansCopy(row);
  const tone =
    row == null
      ? "stale"
      : row.status === "UP"
        ? "live"
        : row.status === "DOWN"
          ? "error"
          : "stale";
  const subtitle = row
    ? `${row.key} ${portHint(row.key)}`.trim()
    : "Select a probe row";

  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Probe detail"
      ariaLabel="Monitoring probe detail"
      title="Probe detail"
      subtitle={subtitle}
      trailing={
        row ? (
          <StatusPill tone={tone}>{row.status}</StatusPill>
        ) : (
          <StatusPill tone="stale">—</StatusPill>
        )
      }
    >
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <section aria-label="What this means">
          <h3 className="mb-2 text-sm font-semibold">What this means</h3>
          <div
            className={
              means.severity === "down"
                ? "rounded border border-error/40 bg-error/15 px-2.5 py-2"
                : "rounded border border-border bg-surface-alt px-2.5 py-2"
            }
          >
            <p
              className={
                means.severity === "down"
                  ? "text-sm font-medium text-error"
                  : "text-sm font-medium"
              }
            >
              {means.title}
            </p>
            <p className="mt-1 text-sm text-text">{means.body}</p>
          </div>
        </section>

        <section aria-label="Technical vitals">
          <h3 className="mb-2 text-sm font-semibold">Technical vitals</h3>
          <dl className="m-0 grid list-none gap-1.5 rounded border border-border bg-surface-alt px-2.5 py-2 p-0">
            <Vital label="status" value={row?.status ?? "—"} error={row?.status === "DOWN"} />
            <Vital
              label="response_time_ms"
              value={formatLatency(row?.responseTimeMs)}
            />
            <Vital
              label="last_checked"
              value={formatClock(row?.lastChecked)}
            />
            <Vital
              label="error"
              value={row?.error || "—"}
              error={Boolean(row?.error)}
            />
          </dl>
        </section>

        <section aria-label="SSE connections">
          <h3 className="mb-2 text-sm font-semibold">SSE connections</h3>
          {relatedStreams.length === 0 ? (
            <div className="rounded border border-border bg-surface-alt px-3 py-3 text-sm text-text-muted">
              No related streams for this service.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {relatedStreams.map((owner) => (
                <li
                  key={owner.key}
                  className="flex items-center justify-between gap-2 rounded border border-border bg-surface-alt px-2.5 py-2"
                >
                  <span className="font-mono text-sm">{owner.label}</span>
                  <ProbeStatusPill status={owner.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-[11px] text-text-muted">
            Inferred from health probes of stream-owning services — not
            EventSource readyState.
          </p>
        </section>

        <section aria-label="Status history">
          <h3 className="mb-2 text-sm font-semibold">Status history</h3>
          {history.length === 0 ? (
            <div className="rounded border border-border bg-surface-alt px-3 py-3 text-sm text-text-muted">
              No UP↔DOWN transitions observed for this service while the page is
              open.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {history.map((item, index) => (
                <li
                  key={`${item.at}-${item.to}-${index}`}
                  className="rounded border border-border bg-surface-alt px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm tabular-nums text-text-muted">
                      {formatClock(item.at)}
                    </span>
                    <ProbeStatusPill status={item.to} />
                  </div>
                  <p className="mt-1 text-sm">{item.message.replace(/^[^:]+:\s*/, "")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="API map">
          <h3 className="mb-2 text-sm font-semibold">API map</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-sm text-accent">
            {API_MAP.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </section>
      </div>
    </SideDrawer>
  );
}

function Vital({
  label,
  value,
  error,
}: {
  label: string;
  value: string;
  error?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd
        className={
          error
            ? "m-0 font-mono text-sm tabular-nums text-error"
            : "m-0 font-mono text-sm tabular-nums"
        }
      >
        {value}
      </dd>
    </div>
  );
}
