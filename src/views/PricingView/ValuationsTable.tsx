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

interface ValuationsTableProps {
  rows: PricingValuationRow[];
  selectedTradeId: string | null;
  nowMs: number;
  onSelectRow: (tradeId: string) => void;
  emptyMessage?: string;
}

export const ValuationsTable = memo(function ValuationsTable({
  rows,
  selectedTradeId,
  nowMs,
  onSelectRow,
  emptyMessage = "No valuations match the current filters.",
}: ValuationsTableProps) {
  const density = useDensity();
  const cellPad =
    density === "compact" ? "px-2 py-1 text-sm" : "px-3 py-2 text-base";

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
          <Th className={cellPad}>Trade</Th>
          <Th className={cellPad}>Symbol</Th>
          <Th className={cellPad}>Book</Th>
          <Th className={cellPad}>Class</Th>
          <Th className={cn(cellPad, "text-right font-mono tabular-nums")}>
            Fair Value
          </Th>
          <Th className={cn(cellPad, "text-right font-mono tabular-nums")}>
            Unrealized
          </Th>
          <Th className={cellPad}>Status</Th>
          <Th className={cn(cellPad, "font-mono tabular-nums")}>Updated</Th>
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
            onSelectRow={onSelectRow}
          />
        ))}
      </tbody>
    </table>
  );
});

interface ValuationRowProps {
  row: PricingValuationRow;
  selected: boolean;
  status: LiveStatus;
  cellPad: string;
  onSelectRow: (tradeId: string) => void;
}

const ValuationRow = memo(function ValuationRow({
  row,
  selected,
  status,
  cellPad,
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
      <Td className={cn(cellPad, "font-mono text-sm tabular-nums text-text-muted")}>
        {row.tradeId}
      </Td>
      <Td className={cn(cellPad, "font-semibold")}>{row.symbol}</Td>
      <Td className={cellPad}>{row.bookName}</Td>
      <Td className={cellPad}>{row.assetClass}</Td>
      <Td className={cn(cellPad, "text-right font-mono tabular-nums")}>
        {formatFairValue(row.fairValue)}
      </Td>
      <Td
        className={cn(
          cellPad,
          "text-right font-mono tabular-nums",
          pnlClass(row.unrealizedPnl),
        )}
      >
        {formatPnl(row.unrealizedPnl)}
      </Td>
      <Td className={cellPad}>
        <StatusPill tone={status}>{status}</StatusPill>
      </Td>
      <Td className={cn(cellPad, "font-mono text-sm tabular-nums text-text-muted")}>
        {formatClock(row.valuationTime)}
      </Td>
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
        "sticky top-0 z-10 border-b border-border bg-surface text-left text-sm font-semibold uppercase tracking-[0.03em] text-text-muted",
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
  return <td className={cn("align-middle", className)}>{children}</td>;
}
