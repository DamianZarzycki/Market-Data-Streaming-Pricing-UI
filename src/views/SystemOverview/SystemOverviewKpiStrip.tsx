import { cn } from "@/lib/cn";
import type { OverviewKpis } from "@/views/SystemOverview/deriveOverview";
import {
  formatClock,
  formatCount,
  formatPnl,
  pnlClass,
} from "@/views/SystemOverview/formatters";

interface SystemOverviewKpiStripProps {
  kpis: OverviewKpis;
}

interface KpiCard {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}

export function SystemOverviewKpiStrip({ kpis }: SystemOverviewKpiStripProps) {
  const items: KpiCard[] = [
    {
      label: "REALIZED PnL",
      value: formatPnl(kpis.realizedPnl),
      hint: "Closed trades · all books",
      valueClassName: pnlClass(kpis.realizedPnl),
    },
    {
      label: "UNREALIZED PnL",
      value: formatPnl(kpis.unrealizedPnl),
      hint: "Open positions mark-to-market",
      valueClassName: pnlClass(kpis.unrealizedPnl),
    },
    {
      label: "ACTIVE TRADES",
      value: formatCount(kpis.activeTrades),
      hint: "Open blotter positions",
    },
    {
      label: "BOOKS",
      value: formatCount(kpis.books),
      hint: "Active trading books",
    },
    {
      label: "ERRORS (5 MIN)",
      value: formatCount(kpis.errors5m),
      hint: kpis.errorsDetail ?? "Awaiting monitoring aggregation",
      valueClassName:
        kpis.errors5m != null && kpis.errors5m > 0 ? "text-stale" : undefined,
    },
    {
      label: "LAST MARKET TICK",
      value: formatClock(kpis.lastMarketTick),
      hint: kpis.lastMarketTickDetail ?? "Not reported by monitoring yet",
      valueClassName: kpis.lastMarketTick ? "text-live" : undefined,
    },
    {
      label: "LAST VALUATION",
      value: formatClock(kpis.lastValuation),
      hint: kpis.lastValuationDetail ?? "Not reported by monitoring yet",
      valueClassName: kpis.lastValuation ? "text-live" : undefined,
    },
  ];

  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-3 py-3 min-[900px]:grid-cols-4"
      role="region"
      aria-label="System overview KPIs"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 rounded border border-border bg-surface px-3 py-2.5"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-text-muted">
            {item.label}
          </span>
          <span
            className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              item.valueClassName,
            )}
          >
            {item.value}
          </span>
          <span className="truncate text-[10px] text-text-muted">
            {item.hint}
          </span>
        </div>
      ))}
    </div>
  );
}
