import { cn } from "@/lib/cn";
import type { MonitoringKpis } from "@/views/MonitoringView/deriveMonitoring";
import {
  formatClock,
  formatCount,
  formatLatency,
} from "@/views/MonitoringView/formatters";

interface MonitoringKpiStripProps {
  kpis: MonitoringKpis;
}

interface Kpi {
  label: string;
  value: string;
  hint: string;
  valueClassName?: string;
}

export function MonitoringKpiStrip({ kpis }: MonitoringKpiStripProps) {
  const items: Kpi[] = [
    {
      label: "SERVICES UP",
      value: `${formatCount(kpis.servicesUp)} / ${formatCount(kpis.servicesTotal)}`,
      hint: "health_cache UP",
      valueClassName:
        kpis.downCount === 0 && kpis.servicesUp > 0 ? "text-live" : undefined,
    },
    {
      label: "DOWN",
      value: formatCount(kpis.downCount),
      hint: kpis.firstDownKey ?? "no outages",
      valueClassName: kpis.downCount > 0 ? "text-error" : undefined,
    },
    {
      label: "AVG LATENCY",
      value: formatLatency(kpis.avgLatencyMs),
      hint: "response_time_ms",
    },
    {
      label: "SLOWEST",
      value: formatLatency(kpis.slowestMs),
      hint: kpis.slowestKey ?? "—",
    },
    {
      label: "LAST POLL",
      value: formatClock(kpis.lastPollAt),
      hint: "last_checked / fetch",
    },
    {
      label: "PROBE ERRORS",
      value: formatCount(kpis.probeErrors),
      hint: "entries with error",
      valueClassName: kpis.probeErrors > 0 ? "text-error" : undefined,
    },
  ];

  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2 border-b border-border px-4 py-3 min-[900px]:grid-cols-3 min-[1200px]:grid-cols-6"
      role="region"
      aria-label="Monitoring KPIs"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-0.5 rounded border border-border bg-surface px-3 py-2.5"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-text-muted">
            {item.label}
          </span>
          <span
            className={cn(
              "font-mono text-lg font-semibold tabular-nums",
              item.valueClassName,
            )}
          >
            {item.value}
          </span>
          <span className="truncate text-[10px] text-text-muted" title={item.hint}>
            {item.hint}
          </span>
        </div>
      ))}
    </div>
  );
}
