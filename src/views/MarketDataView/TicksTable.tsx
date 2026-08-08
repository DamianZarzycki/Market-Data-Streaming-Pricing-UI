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
import type {
  TickSortKey,
  TickSortState,
} from "@/views/MarketDataView/tickSort";

interface TicksTableProps {
  ticks: MarketTickRow[];
  selectedInstrumentKey: string | null;
  nowMs: number;
  sort: TickSortState | null;
  onSortChange: (key: TickSortKey) => void;
  onSelectTick: (instrumentKey: string) => void;
  emptyMessage?: string;
}

const COLUMNS: {
  key: TickSortKey;
  label: string;
  align?: "left" | "right";
}[] = [
  { key: "time", label: "Time" },
  { key: "symbol", label: "Symbol" },
  { key: "dataClass", label: "Data Class" },
  { key: "price", label: "Price / Value", align: "right" },
  { key: "status", label: "Status" },
];

export const TicksTable = memo(function TicksTable({
  ticks,
  selectedInstrumentKey,
  nowMs,
  sort,
  onSortChange,
  onSelectTick,
  emptyMessage = "No ticks match the current filters.",
}: TicksTableProps) {
  const density = useDensity();
  const cellPad =
    density === "compact" ? "px-2 py-1 text-sm" : "px-2.5 py-1.5 text-sm";

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
          {COLUMNS.map((column) => (
            <SortableTh
              key={column.key}
              sortKey={column.key}
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                cellPad,
                column.align === "right" && "text-right font-mono tabular-nums",
              )}
              align={column.align ?? "left"}
            >
              {column.label}
            </SortableTh>
          ))}
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

interface SortableThProps {
  sortKey: TickSortKey;
  sort: TickSortState | null;
  onSortChange: (key: TickSortKey) => void;
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
  dir: TickSortState["dir"] | null;
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
        {formatPrice(tick.price, tick.currency, 4, tick.dataClass)}
      </Td>
      <Td className={cellPad}>
        <StatusPill tone={status}>{status}</StatusPill>
      </Td>
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
