import { MetricStrip } from "@/components/layout/MetricStrip";
import { pnlClass } from "@/components/ui/pnl";
import type { PortfolioSummary } from "@/domain/types";
import {
  formatNumber,
  formatPnl,
} from "@/views/BlotterView/formatters";

interface BlotterSummaryBarProps {
  summary: PortfolioSummary;
  tradeCount: number;
}

export function BlotterSummaryBar({
  summary,
  tradeCount,
}: BlotterSummaryBarProps) {
  return (
    <MetricStrip
      ariaLabel="Portfolio summary"
      columnsClassName="grid-cols-4 max-[1200px]:grid-cols-2"
      items={[
        {
          label: "Total PnL",
          value: formatPnl(summary.total_pnl),
          className: pnlClass(summary.total_pnl),
        },
        {
          label: "Realized",
          value: formatPnl(summary.realized_pnl),
          className: pnlClass(summary.realized_pnl),
        },
        {
          label: "Unrealized",
          value: formatPnl(summary.unrealized_pnl),
          className: pnlClass(summary.unrealized_pnl),
        },
        {
          label: "Alpha / Beta",
          value: (
            <>
              {formatNumber(summary.alpha, 2)} / {formatNumber(summary.beta, 2)}
              <span className="text-sm text-text-muted">
                {" "}
                · {tradeCount} trades
              </span>
            </>
          ),
        },
      ]}
    />
  );
}
