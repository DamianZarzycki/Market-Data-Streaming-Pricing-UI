import { memo, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { LiveStatus } from "@/domain/types";
import { useDensity } from "@/layout/DensityContext";
import { liveStatusFor } from "@/services/pricingMappers";
import type { PricingValuationRow } from "@/services/pricingTypes";
import { cn } from "@/lib/cn";
import {
  formatClock,
  formatFairValue,
  formatPnl,
  pnlClass,
} from "@/views/PricingView/formatters";
import type {
  ValuationSortKey,
  ValuationSortState,
} from "@/views/PricingView/valuationSort";

interface ValuationsTableProps {
  rows: PricingValuationRow[];
  selectedTradeId: string | null;
  nowMs: number;
  sort: ValuationSortState | null;
  onSortChange: (key: ValuationSortKey) => void;
  onSelectRow: (tradeId: string) => void;
  emptyMessage?: string;
}

const COLUMNS: {
  key: ValuationSortKey;
  label: string;
  align?: "left" | "right";
  mono?: boolean;
  /** Shown in compact density when true (default). */
  compact?: boolean;
}[] = [
  { key: "tradeId", label: "Trade", compact: false },
  { key: "symbol", label: "Symbol" },
  { key: "book", label: "Book", compact: false },
  { key: "assetClass", label: "Class", compact: false },
  { key: "fairValue", label: "Fair Value", align: "right", mono: true },
  { key: "unrealizedPnl", label: "Unrealized", align: "right", mono: true },
  { key: "status", label: "Status" },
  { key: "updated", label: "Updated", mono: true, compact: false },
];

export const ValuationsTable = memo(function ValuationsTable({
  rows,
  selectedTradeId,
  nowMs,
  sort,
  onSortChange,
  onSelectRow,
  emptyMessage = "No valuations match the current filters.",
}: ValuationsTableProps) {
  const density = useDensity();
  const isCompact = density === "compact";
  const cellPad = isCompact
    ? "px-2 py-1 text-sm"
    : "px-2.5 py-1.5 text-sm";
  const visibleColumns = COLUMNS.filter(
    (column) => !isCompact || column.compact !== false,
  );

  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr>
          {visibleColumns.map((column) => (
            <SortableTh
              key={column.key}
              sortKey={column.key}
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                cellPad,
                column.align === "right" && "text-right",
                column.mono && "font-mono tabular-nums",
              )}
              align={column.align ?? "left"}
            >
              {column.label}
            </SortableTh>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <ValuationRow
            key={row.tradeId}
            row={row}
            selected={row.tradeId === selectedTradeId}
            status={liveStatusFor(row.receivedAt, nowMs)}
            cellPad={cellPad}
            isCompact={isCompact}
            onSelectRow={onSelectRow}
          />
        ))}
      </tbody>
    </table>
  );
});

interface SortableThProps {
  sortKey: ValuationSortKey;
  sort: ValuationSortState | null;
  onSortChange: (key: ValuationSortKey) => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}

function SortableTh({
  sortKey,
  sort,
  onSortChange,
  children,
  className,
  align = "left",
}: SortableThProps) {
  const active = sort?.key === sortKey;
  const ariaSort = active
    ? sort.dir === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      aria-sort={ariaSort}
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface text-left text-sm font-semibold uppercase tracking-[0.03em] text-text-muted",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={cn(
          "inline-flex w-full cursor-pointer items-center gap-1 text-inherit uppercase tracking-[0.03em]",
          "hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          active && "text-text",
          align === "right" && "justify-end",
        )}
      >
        <span>{children}</span>
        <SortIndicator active={active} dir={active ? sort.dir : null} />
      </button>
    </th>
  );
}

function SortIndicator({
  active,
  dir,
}: {
  active: boolean;
  dir: ValuationSortState["dir"] | null;
}) {
  return (
    <span
      className={cn(
        "inline-block w-3 font-mono text-[0.7rem] leading-none",
        active ? "text-accent" : "text-text-muted/40",
      )}
      aria-hidden
    >
      {active && dir === "asc" ? "▲" : active && dir === "desc" ? "▼" : "◇"}
    </span>
  );
}

interface ValuationRowProps {
  row: PricingValuationRow;
  selected: boolean;
  status: LiveStatus;
  cellPad: string;
  isCompact: boolean;
  onSelectRow: (tradeId: string) => void;
}

const ValuationRow = memo(function ValuationRow({
  row,
  selected,
  status,
  cellPad,
  isCompact,
  onSelectRow,
}: ValuationRowProps) {
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:[&_td]:bg-accent/5",
        selected && "[&_td]:bg-accent/10",
      )}
      onClick={() => onSelectRow(row.tradeId)}
      aria-selected={selected}
    >
      {!isCompact ? (
        <Td
          className={cn(
            cellPad,
            "font-mono text-sm tabular-nums text-text-muted",
          )}
        >
          {row.tradeId}
        </Td>
      ) : null}
      <Td className={cn(cellPad, "font-semibold")}>{row.symbol}</Td>
      {!isCompact ? <Td className={cellPad}>{row.bookName}</Td> : null}
      {!isCompact ? <Td className={cellPad}>{row.assetClass}</Td> : null}
      <Td className={cn(cellPad, "text-right font-mono tabular-nums")}>
        {formatFairValue(row.fairValue, row.currency)}
      </Td>
      <Td
        className={cn(
          cellPad,
          "text-right font-mono tabular-nums",
          pnlClass(row.unrealizedPnl),
        )}
      >
        {formatPnl(row.unrealizedPnl, row.currency)}
      </Td>
      <Td className={cellPad}>
        <StatusPill tone={status}>{status}</StatusPill>
      </Td>
      {!isCompact ? (
        <Td
          className={cn(
            cellPad,
            "font-mono text-sm tabular-nums text-text-muted",
          )}
        >
          {formatClock(row.valuationTime)}
        </Td>
      ) : null}
    </tr>
  );
});

function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("align-middle", className)}>{children}</td>;
}
