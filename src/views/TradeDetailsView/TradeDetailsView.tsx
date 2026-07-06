import { useParams } from "react-router-dom";
import { PlaceholderView } from "@/views/PlaceholderView";

export function TradeDetailsView() {
  const { tradeId } = useParams<{ tradeId: string }>();
  return (
    <PlaceholderView
      title={`Trade Details${tradeId ? ` — ${tradeId}` : ""}`}
      description="Single trade details, valuation history, and related audit logs."
    />
  );
}
