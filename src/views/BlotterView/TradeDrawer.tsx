import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import { pnlClass } from "@/components/ui/pnl";
import type { AuditLog, Trade, Valuation } from "@/domain/types";
import { cn } from "@/lib/cn";
import {
  formatNumber,
  formatPnl,
  formatQuantity,
  formatTimestamp,
} from "@/views/BlotterView/formatters";

export type DrawerTab = "details" | "audit";

interface TradeDrawerProps {
  trade: Trade | null;
  activeTab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  valuationHistory: Valuation[];
  auditLogs: AuditLog[];
  loading?: boolean;
  error?: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const TABS: { id: DrawerTab; label: string }[] = [
  { id: "details", label: "Trade & Pricing" },
  { id: "audit", label: "Audit Logs" },
];

export function TradeDrawer({
  trade,
  activeTab,
  onTabChange,
  valuationHistory,
  auditLogs,
  loading = false,
  error = null,
  collapsed,
  onToggleCollapse,
}: TradeDrawerProps) {
  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel="Trade & Pricing"
      ariaLabel="Trade details"
      title={trade ? (trade.symbol ?? trade.trade_id) : "Selection"}
      subtitle={trade ? trade.trade_id : "Select a trade to inspect"}
      trailing={
        trade?.valuation_status ? (
          <StatusPill tone={trade.valuation_status}>
            {trade.valuation_status}
          </StatusPill>
        ) : null
      }
      headerExtra={
        <nav
          className="flex shrink-0 border-b border-border"
          aria-label="Trade detail sections"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "flex-1 cursor-pointer border-0 border-b-2 border-transparent bg-transparent px-2 py-3 text-sm font-semibold text-text-muted hover:bg-surface-alt hover:text-text",
                activeTab === tab.id && "border-b-accent text-text",
              )}
              onClick={() => onTabChange(tab.id)}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      }
    >
      <div className="p-4">
        {!trade ? (
          <p className="py-4 text-center text-base text-text-muted">
            Choose a row in the live trades table to view details, pricing
            history, and audit logs.
          </p>
        ) : (
          <>
            {error ? (
              <p className="mb-3 text-base text-error" role="alert">
                {error}
              </p>
            ) : null}
            {loading ? (
              <p className="mb-3 text-sm text-text-muted">
                Loading trade details…
              </p>
            ) : null}
            {activeTab === "audit" ? (
              <AuditLogsTab logs={auditLogs} />
            ) : (
              <div className="flex flex-col gap-4">
                <TradeDetailsTab trade={trade} />
                <section className="flex flex-col gap-3 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.04em] text-text-muted">
                    Pricing History
                  </h3>
                  <PricingHistoryTab history={valuationHistory} />
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </SideDrawer>
  );
}

function TradeDetailsTab({ trade }: { trade: Trade }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <DetailItem label="Trade ID" value={trade.trade_id} mono full />
      <DetailItem label="Symbol" value={trade.symbol} />
      <DetailItem label="Book" value={trade.book_name ?? trade.book_id} />
      <DetailItem label="Asset Class" value={trade.asset_class} />
      <DetailItem label="Side" value={trade.side} />
      <DetailItem label="Quantity" value={formatQuantity(trade.quantity)} mono />
      <DetailItem
        label="Trade Price"
        value={formatNumber(trade.trade_price, 4)}
        mono
      />
      <DetailItem label="Currency" value={trade.currency} />
      <DetailItem label="Status" value={trade.status} />
      <DetailItem
        label="Realized PnL"
        value={formatPnl(trade.realized_pnl)}
        mono
        className={pnlClass(trade.realized_pnl)}
      />
      <DetailItem
        label="Unrealized PnL"
        value={formatPnl(trade.unrealized_pnl)}
        mono
        className={pnlClass(trade.unrealized_pnl)}
      />
      <DetailItem
        label="Opened"
        value={formatTimestamp(trade.created_at)}
        full
      />
    </div>
  );
}

function PricingHistoryTab({ history }: { history: Valuation[] }) {
  if (history.length === 0) {
    return (
      <p className="py-4 text-center text-base text-text-muted">
        No valuation history available.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {history.map((item) => (
        <li
          key={`${item.trade_id}-${item.created_at}`}
          className="rounded border border-border bg-surface-alt p-3"
        >
          <div className="mb-2 flex justify-between gap-2 text-sm text-text-muted">
            <span>{formatTimestamp(item.created_at)}</span>
            <StatusPill tone={item.valuation_status}>
              {item.valuation_status}
            </StatusPill>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DetailItem
              label="Fair Value"
              value={`$${formatNumber(item.fair_value, 2)}`}
              mono
            />
            <DetailItem
              label="Unrealized"
              value={formatPnl(item.unrealized_pnl)}
              mono
              className={pnlClass(item.unrealized_pnl)}
            />
            <DetailItem
              label="Realized"
              value={formatPnl(item.realized_pnl)}
              mono
              className={pnlClass(item.realized_pnl)}
            />
            <DetailItem
              label="α / β"
              value={`${formatNumber(item.alpha, 2)} / ${formatNumber(item.beta, 2)}`}
              mono
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AuditLogsTab({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="py-4 text-center text-base text-text-muted">
        No audit logs for this trade.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {logs.map((log) => (
        <li
          key={log.id ?? `${log.event_type}-${log.created_at}`}
          className="rounded border border-border bg-surface-alt p-3"
        >
          <div className="mb-2 flex justify-between gap-2 text-sm text-text-muted">
            <strong>{log.event_type}</strong>
            <span>{formatTimestamp(log.created_at)}</span>
          </div>
          <p>{log.message}</p>
          {log.entity_type ? (
            <p className="text-sm text-text-muted">{log.entity_type}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function DetailItem({
  label,
  value,
  mono,
  full,
  className = "",
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", full && "col-span-full")}>
      <span className="text-sm text-text-muted">{label}</span>
      <span
        className={cn(
          "break-words text-base",
          mono && "font-mono tabular-nums",
          className,
        )}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
