import { StatusPill } from "@/components/ui/StatusPill";
import { SideDrawer } from "@/components/layout/SideDrawer";
import { pnlClass } from "@/components/ui/pnl";
import type { Book } from "@/domain/types";
import { cn } from "@/lib/cn";
import {
  formatCount,
  formatNumber,
  formatPnl,
} from "@/views/BooksView/formatters";

export interface BookPnlSnapshot {
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  activeTrades: number | null;
  alpha: number | null;
  beta: number | null;
}

interface BooksDrawerProps {
  book: Book | null;
  pnl: BookPnlSnapshot | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function BooksDrawer({
  book,
  pnl,
  collapsed,
  onToggleCollapse,
}: BooksDrawerProps) {
  if (!book) {
    return (
      <SideDrawer
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        collapsedLabel="Book PnL"
        ariaLabel="Book PnL"
        title="Book PnL"
        subtitle="Select a book to inspect"
      >
        <div className="flex h-full items-center justify-center px-4 py-8">
          <p className="text-center text-sm text-text-muted">
            Choose a book in the table to see top-level PnL from Blotter /
            Pricing for that book.
          </p>
        </div>
      </SideDrawer>
    );
  }

  const realized = pnl?.realizedPnl ?? book.realized_pnl ?? null;
  const unrealized = pnl?.unrealizedPnl ?? book.unrealized_pnl ?? null;
  const total =
    realized != null || unrealized != null
      ? (realized ?? 0) + (unrealized ?? 0)
      : null;

  return (
    <SideDrawer
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      collapsedLabel={book.name}
      ariaLabel={`${book.name} details`}
      title={book.name}
      subtitle="Book PnL · from Blotter / Pricing"
      trailing={
        <StatusPill tone={book.is_active ? "live" : "stale"}>
          {book.is_active ? "ACTIVE" : "INACTIVE"}
        </StatusPill>
      }
    >
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <section aria-label="Book details">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-muted">
            Book details
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Book ID" value={book.book_id} mono />
            <Detail label="Expected class" value={book.expected_asset_class} />
            <Detail
              label="Status"
              value={book.is_active ? "ACTIVE" : "INACTIVE"}
              valueClassName={book.is_active ? "text-live" : "text-stale"}
            />
            <Detail
              label="Active trades"
              value={formatCount(pnl?.activeTrades)}
            />
          </div>
          <div className="mt-3">
            <Detail
              label="Description"
              value={book.description?.trim() || "—"}
            />
          </div>
        </section>

        <div className="h-px bg-border" />

        <section aria-label="Top-level PnL">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-muted">
            Top-level PnL
          </h3>
          <div className="flex flex-col gap-2.5">
            <PnlCard label="TOTAL PnL" value={formatPnl(total)} tone={total} />
            <PnlCard
              label="UNREALIZED"
              value={formatPnl(unrealized)}
              tone={unrealized}
            />
            <PnlCard
              label="REALIZED"
              value={formatPnl(realized)}
              tone={realized}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <PnlCard
                label="ALPHA"
                value={formatNumber(pnl?.alpha ?? null, 2)}
              />
              <PnlCard
                label="BETA"
                value={formatNumber(pnl?.beta ?? null, 2)}
              />
            </div>
          </div>
        </section>
      </div>
    </SideDrawer>
  );
}

function Detail({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11px] text-text-muted">{label}</span>
      <span
        className={cn(
          "truncate text-sm font-medium",
          mono && "font-mono text-[12px]",
          valueClassName,
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function PnlCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: number | null;
}) {
  return (
    <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
      <p className="text-[11px] font-medium text-text-muted">{label}</p>
      <p
        className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          tone != null ? pnlClass(tone) : undefined,
        )}
      >
        {value}
      </p>
    </div>
  );
}
