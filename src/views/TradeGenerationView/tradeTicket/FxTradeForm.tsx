import { FX_PROVIDERS } from "@/views/TradeGenerationView/tradeTicket/quoteModel";
import { SpotTradeForm } from "@/views/TradeGenerationView/tradeTicket/SpotTradeForm";
import type { TradeFormProps } from "@/views/TradeGenerationView/tradeTicket/types";

export function FxTradeForm(props: TradeFormProps) {
  return (
    <SpotTradeForm
      {...props}
      assetClass="FX"
      symbols={props.symbolMap.FX}
      providers={FX_PROVIDERS}
      source="fx"
      tableHint="NBP · ECB · FRED · FX spot from GET /market-data/fx-quotes, refreshed every 30s · ECB and FRED publish yield curves, not a pair price"
    />
  );
}
