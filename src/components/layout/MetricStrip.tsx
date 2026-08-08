import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface MetricItem {
  label: string;
  value: ReactNode;
  className?: string;
}

interface MetricStripProps {
  items: MetricItem[];
  ariaLabel?: string;
  columnsClassName?: string;
}

export function MetricStrip({
  items,
  ariaLabel = "Summary",
  columnsClassName = "grid-cols-4 max-[1200px]:grid-cols-2",
}: MetricStripProps) {
  return (
    <div
      className={cn(
        "grid shrink-0 gap-2 border-b border-border bg-surface-alt px-3 py-1.5",
        columnsClassName,
      )}
      role="region"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm uppercase tracking-[0.03em] text-text-muted">
            {item.label}
          </span>
          <span
            className={cn(
              "overflow-hidden font-mono text-sm text-ellipsis whitespace-nowrap tabular-nums",
              item.className,
            )}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
