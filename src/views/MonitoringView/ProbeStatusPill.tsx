import { cn } from "@/lib/cn";
import type { ProbeStatus } from "@/views/MonitoringView/deriveMonitoring";

const statusClass: Record<ProbeStatus, string> = {
  UP: "bg-live text-text",
  DOWN: "bg-error text-text",
  UNKNOWN: "bg-surface-alt text-text-muted",
};

interface ProbeStatusPillProps {
  status: ProbeStatus;
  className?: string;
}

export function ProbeStatusPill({ status, className }: ProbeStatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
        statusClass[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-90" aria-hidden />
      {status}
    </span>
  );
}
