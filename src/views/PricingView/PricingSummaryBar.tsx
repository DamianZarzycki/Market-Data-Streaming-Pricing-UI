import { MetricStrip } from "@/components/layout/MetricStrip";
import { pnlClass } from "@/components/ui/pnl";
import { formatPnl } from "@/views/PricingView/formatters";

interface PricingSummaryBarProps {
  updates: number;
  liveCount: number;
  staleCount: number;
  sumUnrealized: number;
}

export function PricingSummaryBar({
  updates,
  liveCount,
  staleCount,
  sumUnrealized,
}: PricingSummaryBarProps) {
  return (
    <MetricStrip
      ariaLabel="Valuation stream summary"
      items={[
        {
          label: "Updates",
          value: updates.toLocaleString("en-US"),
        },
        {
          label: "Live",
          value: liveCount.toLocaleString("en-US"),
        },
        {
          label: "Stale",
          value: staleCount.toLocaleString("en-US"),
          className: staleCount > 0 ? "text-stale" : undefined,
        },
        {
          label: "Σ Unrealized",
          value: formatPnl(sumUnrealized),
          className: pnlClass(sumUnrealized),
        },
      ]}
    />
  );
}
