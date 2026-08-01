import { MetricStrip } from "@/components/layout/MetricStrip";
import { formatTimestamp } from "@/views/MarketDataView/formatters";

interface MarketDataSummaryBarProps {
  ticksReceived: number;
  lastUpdate: string | null;
  visibleCount: number;
  matchedCount: number;
}

export function MarketDataSummaryBar({
  ticksReceived,
  lastUpdate,
  visibleCount,
  matchedCount,
}: MarketDataSummaryBarProps) {
  return (
    <MetricStrip
      ariaLabel="Market data summary"
      columnsClassName="grid-cols-3 max-[900px]:grid-cols-1"
      items={[
        {
          label: "Ticks received",
          value: ticksReceived.toLocaleString("en-US"),
        },
        {
          label: "Last update",
          value: formatTimestamp(lastUpdate),
        },
        {
          label: "Visible rows",
          value: (
            <>
              {visibleCount.toLocaleString("en-US")}
              {matchedCount > visibleCount ? (
                <span className="text-sm text-text-muted">
                  {" "}
                  / {matchedCount.toLocaleString("en-US")}
                </span>
              ) : null}
            </>
          ),
        },
      ]}
    />
  );
}
