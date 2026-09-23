import type { ReactNode } from "react";
import { useDensity } from "@/layout/DensityContext";
import { cn } from "@/lib/cn";
import type { TradeActionEvent } from "@/services/tradeActionTypes";
import {
  formatClock,
  formatLatency,
  shortenRequestId,
} from "@/views/TradeActionView/formatters";
import { ResultPill } from "@/views/TradeActionView/ResultPill";

interface RecentActionsTableProps {
  actions: TradeActionEvent[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  emptyMessage?: string;
}

export function actionRowKey(action: TradeActionEvent, index: number): string {
  if (action.client_request_id && action.client_request_id !== "—") {
    return action.client_request_id;
  }
  return `row-${index}-${action.time}`;
}

export function RecentActionsTable({
  actions,
  selectedKey = null,
  onSelect,
  emptyMessage = "No recent actions yet. POST /trade-actions to see activity.",
}: RecentActionsTableProps) {
  const density = useDensity();
  const isCompact = density === "compact";
  const cellPad = isCompact ? "px-2 py-1" : "px-3 py-2";

  if (actions.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th className={cn(cellPad, "w-[72px]")}>Time</Th>
            {!isCompact ? (
              <Th className={cn(cellPad, "w-[108px]")}>Request ID</Th>
            ) : null}
            <Th className={cn(cellPad, "w-[108px]")}>Action</Th>
            {!isCompact ? (
              <Th className={cn(cellPad, "w-[72px]")}>Symbol</Th>
            ) : null}
            <Th className={cn(cellPad, "w-[118px]")}>Result</Th>
            <Th className={cn(cellPad, "w-[72px] text-right")}>Latency</Th>
            {!isCompact ? <Th className={cellPad}>Note</Th> : null}
          </tr>
        </thead>
        <tbody>
          {actions.map((action, index) => {
            const rowKey = actionRowKey(action, index);
            const selected = selectedKey === rowKey;
            return (
            <tr
              key={rowKey}
              tabIndex={onSelect ? 0 : undefined}
              aria-selected={selected}
              onClick={() => onSelect?.(rowKey)}
              onKeyDown={(event) => {
                if (!onSelect) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(rowKey);
                }
              }}
              className={cn(
                onSelect && "cursor-pointer hover:bg-surface-alt",
                selected ? "bg-accent/10" : index % 2 === 1 && "bg-surface-alt/60",
              )}
            >
              <Td className={cn(cellPad, "font-mono tabular-nums")}>
                {formatClock(action.time)}
              </Td>
              {!isCompact ? (
                <Td
                  className={cn(cellPad, "max-w-[108px] truncate font-mono")}
                  title={action.client_request_id}
                >
                  {shortenRequestId(action.client_request_id)}
                </Td>
              ) : null}
              <Td
                className={cn(cellPad, "max-w-[108px] truncate")}
                title={action.action_type}
              >
                {action.action_type || "—"}
              </Td>
              {!isCompact ? (
                <Td className={cellPad}>{action.symbol || "—"}</Td>
              ) : null}
              <Td className={cellPad}>
                <ResultPill result={action.result} />
              </Td>
              <Td className={cn(cellPad, "text-right font-mono tabular-nums")}>
                {formatLatency(action.latency_ms)}
              </Td>
              {!isCompact ? (
                <Td
                  className={cn(
                    cellPad,
                    "max-w-[240px] truncate text-text-muted",
                  )}
                  title={action.note}
                >
                  {action.note || "—"}
                </Td>
              ) : null}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
        "sticky top-0 z-10 border-b border-border bg-surface-alt text-left text-[10px] font-medium uppercase tracking-[0.04em] text-text-muted",
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
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={cn("align-middle", className)} title={title}>
      {children}
    </td>
  );
}
