import { EQUITY_PROVIDERS } from "@/views/TradeGenerationView/tradeTicket/quoteModel";
import { SpotTradeForm } from "@/views/TradeGenerationView/tradeTicket/SpotTradeForm";
import type { TradeFormProps } from "@/views/TradeGenerationView/tradeTicket/types";

export function EquityTradeForm(props: TradeFormProps) {
  return (
    <SpotTradeForm
      {...props}
      assetClass="EQUITY"
      symbols={props.symbolMap.EQUITY}
      providers={EQUITY_PROVIDERS}
      source="stream"
      tableHint="Alpha Vantage · Finnhub · Twelve Data · ticks update in place via GET /market-data/stream · pick the row that prices the trade"
    />
  );
}
