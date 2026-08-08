import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ProbeKey, ProbeRow } from "@/views/MonitoringView/deriveMonitoring";
import {
  formatClock,
  formatLatency,
} from "@/views/MonitoringView/formatters";
import { ProbeStatusPill } from "@/views/MonitoringView/ProbeStatusPill";

interface ProbeResultsTableProps {
  rows: ProbeRow[];
  selectedKey: ProbeKey | null;
  onSelect: (key: ProbeKey) => void;
  emptyMessage?: string;
}

export function ProbeResultsTable({
  rows,
  selectedKey,
  onSelect,
  emptyMessage = "No probe results yet. Waiting for GET /status.",
}: ProbeResultsTableProps) {
  if (rows.length === 0) {
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
            <Th className="w-[220px]">Service</Th>
            <Th className="w-[88px]">Status</Th>
            <Th className="w-[96px]">Response</Th>
            <Th className="w-[120px]">Last checked</Th>
            <Th>Error</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const selected = row.key === selectedKey;
            const down = row.status === "DOWN";
            return (
              <tr
                key={row.key}
                tabIndex={0}
                aria-selected={selected}
                className={cn(
                  "cursor-pointer outline-none transition-colors",
                  selected && down && "bg-error/15",
                  selected && !down && "bg-accent/15",
                  !selected && index % 2 === 1 && "bg-surface-alt/60",
                  !selected && "hover:bg-surface-alt/80",
                )}
                onClick={() => onSelect(row.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(row.key);
                  }
                }}
              >
                <Td className="font-mono text-text">{row.key}</Td>
                <Td>
                  <ProbeStatusPill status={row.status} />
                </Td>
                <Td className="font-mono tabular-nums">
                  {formatLatency(row.responseTimeMs)}
                </Td>
                <Td className="font-mono tabular-nums text-text-muted">
                  {formatClock(row.lastChecked)}
                </Td>
                <Td
                  className={cn(
                    "max-w-[280px] truncate",
                    row.error ? "text-error" : "text-text-muted",
                  )}
                  title={row.error ?? undefined}
                >
                  {row.error || "—"}
                </Td>
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
