import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type { LiveStatus } from "@/domain/types";
import type { MarketTickRow, PricePoint } from "@/services/marketDataTypes";
import { cn } from "@/lib/cn";
import {
  formatPrice,
  formatTimestamp,
} from "@/views/MarketDataView/formatters";
import { PriceSparkline } from "@/views/MarketDataView/PriceSparkline";

interface MarketDataDrawerProps {
  tick: MarketTickRow | null;
  status: LiveStatus | null;
  priceHistory: PricePoint[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function MarketDataDrawer({
  tick,
  status,
  priceHistory,
  collapsed,
  onToggleCollapse,
}: MarketDataDrawerProps) {
  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Price History"
      ariaLabel="Tick details"
      title={tick ? tick.symbol : "Selection"}
      subtitle={tick ? tick.dataClass : "Select a tick to inspect"}
      trailing={
        status ? <StatusPill tone={status}>{status}</StatusPill> : null
      }
    >
      <div className="px-4 py-4">
        {!tick ? (
          <div className="rounded border border-border bg-surface-alt px-4 py-6 text-center text-text-muted">
            No row selected. Click a tick to view price history and details.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <section aria-label="Price history">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
                Price history
              </h3>
              <p className="mb-2 text-sm text-text-muted">
                Last {priceHistory.length} points · up to 100 / 5 min
              </p>
              <PriceSparkline points={priceHistory} currency={tick.currency} />
            </section>

            <section aria-label="Tick details">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
                Latest tick
              </h3>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-base">
                <Detail label="Symbol" value={tick.symbol} />
                <Detail label="Data class" value={tick.dataClass} />
                <Detail
                  label="Price / value"
                  value={formatPrice(tick.price, tick.currency)}
                  mono
                />
                {tick.currency ? (
                  <Detail label="Currency" value={tick.currency} />
                ) : null}
                <Detail
                  label="Timestamp"
                  value={formatTimestamp(tick.timestamp)}
                />
                {tick.eventId !== undefined ? (
                  <Detail label="Event ID" value={String(tick.eventId)} mono />
                ) : null}
              </dl>
            </section>

            <section aria-label="Raw fields">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
                Raw fields
              </h3>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {Object.entries(tick.raw)
                  .filter(([, value]) => value !== undefined && value !== null)
                  .map(([key, value]) => (
                    <li
                      key={key}
                      className="flex justify-between gap-2 border-b border-border py-1 text-sm"
                    >
                      <span className="text-text-muted">{key}</span>
                      <span
                        className={cn(
                          "max-w-[60%] truncate text-right font-mono tabular-nums",
                          typeof value === "number" && "text-text",
                        )}
                        title={formatRawValue(value)}
                      >
                        {formatRawValue(value)}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </SideDrawer>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className={cn("m-0", mono && "font-mono tabular-nums")}>{value}</dd>
    </>
  );
}

function formatRawValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
