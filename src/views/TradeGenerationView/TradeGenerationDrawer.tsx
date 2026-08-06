import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type { TradeGenerationStatus } from "@/services/tradeGenerationTypes";
import { cn } from "@/lib/cn";

interface TradeGenerationDrawerProps {
  status: TradeGenerationStatus | null;
  serviceUp: boolean | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const DEPENDENCIES = [
  {
    name: "books-service",
    detail: "GET /books · pick random book",
  },
  {
    name: "market-data-service",
    detail: "GET /symbols · by asset class",
  },
  {
    name: "trade-action-service",
    detail: "POST /trade-actions[/batch]",
  },
  {
    name: "database",
    detail: "active trades for CLOSE",
  },
] as const;

const IMPLEMENTED_API = [
  "GET /health",
  "GET /status",
  "POST /start",
  "POST /stop",
  "GET /generate-once",
  "GET /generate-batch",
] as const;

export function TradeGenerationDrawer({
  status,
  serviceUp,
  collapsed,
  onToggleCollapse,
}: TradeGenerationDrawerProps) {
  const tone =
    serviceUp == null ? "stale" : serviceUp ? "live" : "error";
  const label =
    serviceUp == null ? "…" : serviceUp ? "UP" : "DOWN";

  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Service info"
      ariaLabel="Trade generation service info"
      title="Service info"
      subtitle="trade-generation-service :8007"
      trailing={<StatusPill tone={tone}>{label}</StatusPill>}
    >
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <section aria-label="What this does">
          <h3 className="mb-2 text-sm font-semibold">What this does</h3>
          <p className="text-sm text-text-muted">
            Builds random OPEN/CLOSE trade intentions and posts them to
            trade-action-service. Continuous mode loops on an env tick
            interval; manual once/batch work even when the worker is stopped.
          </p>
        </section>

        <section aria-label="Status snapshot">
          <h3 className="mb-2 text-sm font-semibold">GET /status snapshot</h3>
          <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
            <dl className="m-0 flex flex-col gap-2 text-sm">
              <Row
                label="is_running"
                value={
                  status == null ? "—" : String(status.is_running)
                }
                valueClassName={
                  status?.is_running ? "text-live" : "text-stale"
                }
              />
              <Row
                label="total_generated"
                value={
                  status == null
                    ? "—"
                    : String(status.total_generated)
                }
              />
              <Row label="thread" value="(omitted from API)" />
            </dl>
          </div>
        </section>

        <section aria-label="Dependencies">
          <h3 className="mb-2 text-sm font-semibold">Dependencies</h3>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {DEPENDENCIES.map((dep) => (
              <li
                key={dep.name}
                className="rounded border border-border bg-surface-alt px-2.5 py-2"
              >
                <p className="text-sm font-medium">{dep.name}</p>
                <p className="text-sm text-text-muted">{dep.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="API map">
          <h3 className="mb-2 text-sm font-semibold">API map</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-sm text-accent">
            {IMPLEMENTED_API.map((path) => (
              <li key={path}>{path}</li>
            ))}
          </ul>
        </section>
      </div>
    </SideDrawer>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className={cn("m-0 font-mono tabular-nums", valueClassName)}>
        {value}
      </dd>
    </div>
  );
}
