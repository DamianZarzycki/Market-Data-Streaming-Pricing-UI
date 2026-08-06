import type { ReactNode } from "react";
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
  emptyMessage?: string;
}

export function RecentActionsTable({
  actions,
  emptyMessage = "No recent actions yet. POST /trade-actions to see activity.",
}: RecentActionsTableProps) {
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
            <Th className="w-[72px]">Time</Th>
            <Th className="w-[108px]">Request ID</Th>
            <Th className="w-[108px]">Action</Th>
            <Th className="w-[72px]">Symbol</Th>
            <Th className="w-[118px]">Result</Th>
            <Th className="w-[72px] text-right">Latency</Th>
            <Th>Note</Th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, index) => (
            <tr
              key={`${action.client_request_id}-${action.time}-${index}`}
              className={cn(index % 2 === 1 && "bg-surface-alt/60")}
            >
              <Td className="font-mono tabular-nums">
                {formatClock(action.time)}
              </Td>
              <Td
                className="max-w-[108px] truncate font-mono"
                title={action.client_request_id}
              >
                {shortenRequestId(action.client_request_id)}
              </Td>
              <Td className="max-w-[108px] truncate" title={action.action_type}>
                {action.action_type || "—"}
              </Td>
              <Td>{action.symbol || "—"}</Td>
              <Td>
                <ResultPill result={action.result} />
              </Td>
              <Td className="text-right font-mono tabular-nums">
                {formatLatency(action.latency_ms)}
              </Td>
              <Td
                className="max-w-[240px] truncate text-text-muted"
                title={action.note}
              >
                {action.note || "—"}
              </Td>
            </tr>
          ))}
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
        "sticky top-0 z-10 border-b border-border bg-surface-alt px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.04em] text-text-muted",
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
    <td className={cn("px-3 py-2 align-middle", className)} title={title}>
      {children}
    </td>
  );
}
