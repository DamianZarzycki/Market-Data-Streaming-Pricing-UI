import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import type { LiveStatus } from "@/domain/types";
import type {
  PricingValuationRow,
  StreamInsights,
} from "@/services/pricingTypes";
import { cn } from "@/lib/cn";
import {
  formatAge,
  formatAlphaBeta,
  formatClock,
  formatFairValue,
  formatPnl,
  pnlClass,
} from "@/views/PricingView/formatters";

interface PricingDrawerProps {
  row: PricingValuationRow | null;
  status: LiveStatus | null;
  insights: StreamInsights;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PricingDrawer({
  row,
  status,
  insights,
  collapsed,
  onToggleCollapse,
}: PricingDrawerProps) {
  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Stream Insights"
      ariaLabel="Valuation details and stream insights"
      title={row ? row.symbol : "Stream Insights"}
      subtitle={
        row
          ? `${row.tradeId} · ${row.bookName}`
          : "Select a valuation for details"
      }
      trailing={
        status ? <StatusPill tone={status}>{status}</StatusPill> : null
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        {!row ? (
          <div className="rounded border border-accent bg-accent px-3.5 py-3.5 text-center text-white">
            <p className="text-base font-semibold">No row selected</p>
            <p className="mt-1 text-sm text-white/90">
              Insights below still update from the SSE stream. Click a row in
              the valuations table to inspect a single trade.
            </p>
          </div>
        ) : (
          <section aria-label="Selected valuation">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
              Selected valuation
            </h3>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-3">
              <Metric
                label="Fair value"
                value={formatFairValue(row.fairValue, {
                  currencyPrefix: true,
                })}
                mono
              />
              <Metric
                label="Unrealized"
                value={formatPnl(row.unrealizedPnl)}
                mono
                className={pnlClass(row.unrealizedPnl)}
              />
              <Metric
                label="Realized"
                value={formatPnl(row.realizedPnl)}
                mono
                className={pnlClass(row.realizedPnl)}
              />
              <Metric
                label="Book α / β"
                value={formatAlphaBeta(row.alpha, row.beta)}
                mono
              />
              <Metric label="Asset class" value={String(row.assetClass)} />
              <Metric
                label="Updated"
                value={formatClock(row.valuationTime, true)}
                mono
              />
            </dl>
          </section>
        )}

        <section aria-label="Stream insights" className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
              Stream insights
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Derived from the live valuation stream — updates without
              re-rendering the whole app.
            </p>
          </div>

          <InsightGroup title="Most frequent updates" accent>
            {insights.frequent.length === 0 ? (
              <EmptyInsight>Waiting for stream updates…</EmptyInsight>
            ) : (
              insights.frequent.map((item) => (
                <InsightRow
                  key={item.key}
                  title={item.symbol}
                  subtitle={`${item.assetClass} · ${item.ticksPerMin} ticks/min`}
                  value={`${item.ticksPerMin}/min`}
                  valueClassName="text-accent"
                />
              ))
            )}
          </InsightGroup>

          <InsightGroup title="Stale valuations">
            {insights.stale.length === 0 ? (
              <EmptyInsight>No stale valuations.</EmptyInsight>
            ) : (
              insights.stale.map((item) => (
                <InsightRow
                  key={item.tradeId}
                  title={item.symbol}
                  subtitle={`${item.bookName} · last ${formatClock(item.lastUpdated)}`}
                  value={formatAge(item.ageMs)}
                  valueClassName="text-stale"
                />
              ))
            )}
          </InsightGroup>

          <InsightGroup title="Biggest PnL impact">
            {insights.pnlImpact.length === 0 ? (
              <EmptyInsight>No unrealized PnL yet.</EmptyInsight>
            ) : (
              insights.pnlImpact.map((item) => (
                <InsightRow
                  key={item.tradeId}
                  title={item.symbol}
                  subtitle={`${item.bookName} · unrealized`}
                  value={formatPnl(item.unrealizedPnl)}
                  valueClassName={pnlClass(item.unrealizedPnl)}
                />
              ))
            )}
          </InsightGroup>
        </section>
      </div>
    </SideDrawer>
  );
}

function Metric({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd
        className={cn(
          "m-0 text-base",
          mono && "font-mono tabular-nums",
          className,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function InsightGroup({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h4
        className={cn(
          "text-sm font-semibold uppercase tracking-[0.03em]",
          accent ? "text-accent" : "text-text-muted",
        )}
      >
        {title}
      </h4>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{children}</ul>
    </div>
  );
}

function InsightRow({
  title,
  subtitle,
  value,
  valueClassName,
}: {
  title: string;
  subtitle: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded border border-border bg-surface-alt px-2.5 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-text-muted">{subtitle}</p>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </span>
    </li>
  );
}

function EmptyInsight({ children }: { children: ReactNode }) {
  return (
    <li className="rounded border border-border bg-surface-alt px-2.5 py-2 text-sm text-text-muted">
      {children}
    </li>
  );
}
