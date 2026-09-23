import { useEffect, useMemo, useState } from "react";
import type { ProviderQuoteEvent } from "@/services/providerQuotesTypes";
import {
  providerLabel,
  quoteStatusOf,
  quoteStaleWindow,
  referencePriceOf,
  type QuoteSource,
  type QuoteStatus,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

interface UseQuoteSelectionArgs {
  quotes: ProviderQuoteEvent[];
  providers: { key: string; label: string }[];
  symbol: string;
  assetClass: string;
  nowMs: number;
  source: QuoteSource;
}

export function useQuoteSelection({
  quotes,
  providers,
  symbol,
  assetClass,
  nowMs,
  source,
}: UseQuoteSelectionArgs) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => {
    setSelectedProvider(null);
  }, [symbol, assetClass]);

  const quoteByProvider = useMemo(() => {
    const map = new Map<string, ProviderQuoteEvent>();
    for (const quote of quotes) map.set(quote.provider, quote);
    return map;
  }, [quotes]);

  const staleMs = quoteStaleWindow(source);
  const statusOf = (quote: ProviderQuoteEvent | null): QuoteStatus =>
    quoteStatusOf(quote, nowMs, staleMs);

  const selectedQuote =
    quotes.find((quote) => quote.provider === selectedProvider) ?? null;
  const selectedStatus: QuoteStatus = selectedQuote
    ? statusOf(selectedQuote)
    : "MISSING";

  return {
    selectedProvider,
    setSelectedProvider,
    quoteByProvider,
    statusOf,
    selectedQuote,
    selectedStatus,
    selectedProviderLabel: providerLabel(providers, selectedProvider),
    referencePrice: referencePriceOf(selectedQuote),
    currency: selectedQuote?.currency ?? "USD",
  };
}
