import { YIELD_PROVIDERS } from "@/views/TradeGenerationView/tradeTicket/quoteModel";
import { SpotTradeForm } from "@/views/TradeGenerationView/tradeTicket/SpotTradeForm";
import type { TradeFormProps } from "@/views/TradeGenerationView/tradeTicket/types";

export function BondTradeForm(props: TradeFormProps) {
  return (
    <SpotTradeForm
      {...props}
      assetClass="BOND"
      symbols={props.symbolMap.BOND}
      providers={YIELD_PROVIDERS}
      source="curve"
      tableHint="FRED · ECB · yield from GET /market-data/curve-quotes, refreshed every 30s · the other curve has no tenor for this symbol"
    />
  );
}
