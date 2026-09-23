import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type {
  TradeActionEvent,
  TradeActionStatus,
} from "@/services/tradeActionTypes";
import {
  formatClock,
  formatLatency,
} from "@/views/TradeActionView/formatters";
import { ResultPill } from "@/views/TradeActionView/ResultPill";

interface TradeActionDrawerProps {
  status: TradeActionStatus | null;
  serviceUp: boolean | null;
  selectedAction: TradeActionEvent | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const RESILIENCE = [
  {
    title: "202 Accepted",
    detail: "Async enqueue — request accepted into the worker queue",
  },
  {
    title: "400 Rejected",
    detail: "Invalid action_type or missing client_request_id",
  },
  {
    title: "503 Overloaded",
    detail: "Queue full — put(block=False) raised Full",
  },
  {
    title: "Idempotency",
    detail: "Duplicate client_request_id is skipped",
  },
  {
    title: "Row lock",
    detail: "CLOSE uses SELECT … FOR UPDATE",
  },
] as const;

const API_MAP = [
  "GET /health",
  "GET /status",
  "POST /trade-actions",
  "POST /trade-actions/batch",
] as const;

export function TradeActionDrawer({
  status,
  serviceUp,
  selectedAction,
  collapsed,
  onToggleCollapse,
}: TradeActionDrawerProps) {
  const tone =
    serviceUp == null ? "stale" : serviceUp ? "live" : "error";
  const label =
    serviceUp == null ? "…" : serviceUp ? "UP" : "DOWN";
  const rejects = status?.recent_rejects ?? [];

  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Pipeline info"
      ariaLabel="Trade action pipeline info"
      title="Pipeline info"
      subtitle="trade-action-service :8080"
      trailing={<StatusPill tone={tone}>{label}</StatusPill>}
    >
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        {selectedAction ? (
          <SelectedActionDetails action={selectedAction} />
        ) : null}
        <section aria-label="Resilience signals">
          <h3 className="mb-2 text-sm font-semibold">Resilience signals</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {RESILIENCE.map((item) => (
              <li
                key={item.title}
                className="rounded border border-border bg-surface-alt px-2.5 py-2"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-sm text-text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Recent rejects">
          <h3 className="mb-2 text-sm font-semibold">
            Recent rejects / invalid
          </h3>
          {rejects.length === 0 ? (
            <div className="rounded border border-border bg-surface-alt px-3 py-3 text-sm text-text-muted">
              No recent rejects.
            </div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {rejects.slice(0, 8).map((item, index) => (
                <li
                  key={`${item.client_request_id}-${item.time}-${index}`}
                  className="rounded border border-border bg-surface-alt px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm tabular-nums text-text-muted">
                      {formatClock(item.time)}
                    </span>
                    <span className="truncate font-mono text-[10px] text-text-muted">
                      {item.client_request_id}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-error">{item.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Last DB write">
          <h3 className="mb-2 text-sm font-semibold">Last DB write</h3>
          <div className="rounded border border-border bg-surface-alt px-3 py-2.5 font-mono text-sm tabular-nums">
            {status?.last_db_write
              ? formatClock(status.last_db_write)
              : "—"}
          </div>
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

function SelectedActionDetails({ action }: { action: TradeActionEvent }) {
  return (
    <section aria-label="Selected action">
      <h3 className="mb-2 text-sm font-semibold">Selected action</h3>
      <dl className="m-0 flex flex-col gap-2 rounded border border-border bg-surface-alt px-3 py-2.5 text-sm">
        <Detail label="Time" value={action.time} mono />
        <Detail label="Request ID" value={action.client_request_id} mono />
        <Detail label="Action" value={action.action_type || "—"} />
        <Detail label="Symbol" value={action.symbol || "—"} />
        <div className="flex items-start justify-between gap-3">
          <dt className="text-text-muted">Result</dt>
          <dd className="m-0">
            <ResultPill result={action.result} />
          </dd>
        </div>
        <Detail label="Latency" value={formatLatency(action.latency_ms)} mono />
        <div className="flex flex-col gap-1">
          <dt className="text-text-muted">Note</dt>
          <dd className="m-0 whitespace-pre-wrap break-words">
            {action.note || "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className={`m-0 min-w-0 break-all text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
