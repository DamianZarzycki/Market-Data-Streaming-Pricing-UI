import { memo, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import { pnlClass } from "@/components/ui/pnl";
import type { Trade } from "@/domain/types";
import { useDensity } from "@/layout/DensityContext";
import { cn } from "@/lib/cn";
import {
  formatNumber,
  formatPnl,
  formatQuantity,
  formatTimestamp,
} from "@/views/BlotterView/formatters";

interface TradesTableProps {
  trades: Trade[];
  selectedTradeId: string | null;
  onSelectTrade: (tradeId: string) => void;
  emptyMessage?: string;
}

type ColumnKey =
  | "symbol"
  | "book"
  | "assetClass"
  | "price"
  | "qty"
  | "side"
  | "status"
  | "realized"
  | "unrealized"
  | "updated";

const COLUMNS: {
  key: ColumnKey;
  label: string;
  align?: "left" | "right";
  /** Shown in compact density when true (default). */
  compact?: boolean;
}[] = [
  { key: "symbol", label: "Symbol" },
  { key: "book", label: "Book" },
  { key: "assetClass", label: "Asset Class", compact: false },
  { key: "price", label: "Price", align: "right", compact: false },
  { key: "qty", label: "Qty", align: "right" },
  { key: "side", label: "Side" },
  { key: "status", label: "Status" },
  { key: "realized", label: "Realized PnL", align: "right", compact: false },
  { key: "unrealized", label: "Unrealized PnL", align: "right" },
  { key: "updated", label: "Updated", compact: false },
];

export const TradesTable = memo(function TradesTable({
  trades,
  selectedTradeId,
  onSelectTrade,
  emptyMessage = "No trades match the current filters.",
}: TradesTableProps) {
  const density = useDensity();
  const isCompact = density === "compact";
  const cellPad = isCompact
    ? "px-2 py-1 text-sm"
    : "px-2.5 py-1.5 text-sm";
  const visibleColumns = COLUMNS.filter(
    (column) => !isCompact || column.compact !== false,
  );

  if (trades.length === 0) {
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
            <Th
              key={column.key}
              className={cn(
                cellPad,
                column.align === "right" && "text-right font-mono tabular-nums",
              )}
            >
              {column.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <TradeRow
            key={trade.trade_id}
            trade={trade}
            selected={trade.trade_id === selectedTradeId}
            cellPad={cellPad}
            isCompact={isCompact}
            onSelectTrade={onSelectTrade}
          />
        ))}
      </tbody>
    </table>
  );
});

interface TradeRowProps {
  trade: Trade;
  selected: boolean;
  cellPad: string;
  isCompact: boolean;
  onSelectTrade: (tradeId: string) => void;
}

const TradeRow = memo(function TradeRow({
  trade,
  selected,
  cellPad,
  isCompact,
  onSelectTrade,
}: TradeRowProps) {
  return (
    <tr
      className={cn(
        "cursor-pointer hover:[&_td]:bg-accent/5",
        selected && "[&_td]:bg-accent/10",
      )}
      onClick={() => onSelectTrade(trade.trade_id)}
      aria-selected={selected}
    >
      <Td className={cellPad}>
        <strong>{trade.symbol ?? "—"}</strong>
      </Td>
      <Td className={cellPad}>{trade.book_name ?? trade.book_id}</Td>
      {!isCompact ? <Td className={cellPad}>{trade.asset_class}</Td> : null}
      {!isCompact ? (
        <Td
          className={cn(
            cellPad,
            "whitespace-nowrap text-right font-mono tabular-nums",
          )}
        >
          <span className="text-base font-bold tracking-[0.01em] text-text">
            {formatNumber(trade.trade_price, 4)}
          </span>
          {trade.currency ? (
            <span className="ml-1 text-sm font-semibold text-accent">
              {trade.currency}
            </span>
          ) : null}
        </Td>
      ) : null}
      <Td className={cn(cellPad, "text-right font-mono tabular-nums")}>
        {formatQuantity(trade.quantity)}
      </Td>
      <Td className={cellPad}>{trade.side ?? "—"}</Td>
      <Td className={cellPad}>
        <StatusPill tone={trade.valuation_status ?? "LIVE"}>
          {trade.status ?? "—"}
        </StatusPill>
      </Td>
      {!isCompact ? (
        <Td
          className={cn(
            cellPad,
            "text-right font-mono tabular-nums",
            pnlClass(trade.realized_pnl),
          )}
        >
          {formatPnl(trade.realized_pnl)}
        </Td>
      ) : null}
      <Td
        className={cn(
          cellPad,
          "text-right font-mono tabular-nums",
          pnlClass(trade.unrealized_pnl),
        )}
      >
        {formatPnl(trade.unrealized_pnl)}
      </Td>
      {!isCompact ? (
        <Td className={cn(cellPad, "whitespace-nowrap tabular-nums")}>
          {formatTimestamp(trade.created_at)}
        </Td>
      ) : null}
    </tr>
  );
});

function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-surface text-left font-semibold text-text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-border text-left", className)}>
      {children}
    </td>
  );
}
