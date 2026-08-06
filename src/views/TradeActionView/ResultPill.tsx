import { cn } from "@/lib/cn";
import type { ActionResult } from "@/services/tradeActionTypes";

const resultClass: Record<string, string> = {
  PROCESSED: "bg-live text-text",
  QUEUED: "bg-accent text-text",
  DUPLICATE: "bg-stale text-text",
  REJECTED: "bg-error text-text",
  ERROR: "bg-error text-text",
};

interface ResultPillProps {
  result: ActionResult | string;
  className?: string;
}

export function ResultPill({ result, className }: ResultPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        resultClass[result] ?? "bg-surface-alt text-text-muted",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-90" aria-hidden />
      {result}
    </span>
  );
}
