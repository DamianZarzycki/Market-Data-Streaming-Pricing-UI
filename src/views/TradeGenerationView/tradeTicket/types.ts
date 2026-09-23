import type { Book } from "@/domain/types";
import type { SymbolMap } from "@/services/providerQuotesService";
import type { ProviderQuoteEvent } from "@/services/providerQuotesTypes";
import type { OpenTradeActionPayload } from "@/services/tradeActionTypes";
import type { QuoteStatus } from "@/views/TradeGenerationView/tradeTicket/quoteModel";

export interface TradeFormProps {
  book: Book;
  symbolMap: SymbolMap;
  nowMs: number;
  onDraftChange: (draft: TradeTicketDraft | null) => void;
}

export interface TradeTicketDraft {
  canSubmit: boolean;
  status: QuoteStatus;
  providerLabel: string | null;
  symbol: string;
  quote: ProviderQuoteEvent | null;
  payload: OpenTradeActionPayload | null;
}
