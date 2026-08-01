import { memo, type ReactNode } from "react";
import { StatusPill } from "@/components/ui/StatusPill";
import type { LiveStatus } from "@/domain/types";
import { useDensity } from "@/layout/DensityContext";
import { liveStatusFor } from "@/services/marketDataMappers";
import type { MarketTickRow } from "@/services/marketDataTypes";
import { cn } from "@/lib/cn";
import {
  formatPrice,
  formatTimestamp,
} from "@/views/MarketDataView/formatters";

interface TicksTableProps {
  ticks: MarketTickRow[];
  selectedInstrumentKey: string | null;
  nowMs: number;
  onSelectTick: (instrumentKey: string) => void;
  emptyMessage?: string;
}

export const TicksTable = memo(function TicksTable({
  ticks,
  selectedInstrumentKey,
  nowMs,
  onSelectTick,
  emptyMessage = "No ticks match the current filters.",
}: TicksTableProps) {
  const density = useDensity();
  const cellPad =
    density === "compact" ? "px-2 py-1 text-sm" : "px-3 py-2 text-base";

  if (ticks.length === 0) {
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
          <Th className={cellPad}>Time</Th>
          <Th className={cellPad}>Symbol</Th>
          <Th className={cellPad}>Data Class</Th>
          <Th className={cn(cellPad, "text-right font-mono tabular-nums")}>
            Price / Value
          </Th>
          <Th className={cellPad}>Status</Th>
        </tr>
      </thead>
      <tbody>
        {ticks.map((tick) => (
          <TickRow
            key={tick.instrumentKey}
            tick={tick}
            selected={tick.instrumentKey === selectedInstrumentKey}
            status={liveStatusFor(tick.receivedAt, nowMs)}
            cellPad={cellPad}
            onSelectTick={onSelectTick}
          />
        ))}
      </tbody>
    </table>
  );
});

interface TickRowProps {
  tick: MarketTickRow;
  selected: boolean;
  status: LiveStatus;
  cellPad: string;
  onSelectTick: (instrumentKey: string) => void;
}

const TickRow = memo(function TickRow({
  tick,
  selected,
  status,
  cellPad,
  onSelectTick,
}: TickRowProps) {
  return (
    <tr
      className={cn(
        "cursor-pointer border-b border-border transition-colors hover:bg-surface-alt",
        selected && "bg-surface-alt",
      )}
      onClick={() => onSelectTick(tick.instrumentKey)}
      aria-selected={selected}
    >
      <Td className={cn(cellPad, "font-mono text-sm tabular-nums text-text-muted")}>
        {formatTimestamp(tick.timestamp)}
      </Td>
      <Td className={cn(cellPad, "font-semibold")}>{tick.symbol}</Td>
      <Td className={cellPad}>{tick.dataClass}</Td>
      <Td className={cn(cellPad, "text-right font-mono tabular-nums")}>
        {formatPrice(tick.price, tick.currency)}
      </Td>
      <Td className={cellPad}>
        <StatusPill tone={status}>{status}</StatusPill>
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
