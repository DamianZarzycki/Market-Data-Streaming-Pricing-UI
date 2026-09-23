import { useEffect, useMemo, useState } from "react";
import { useSseStream } from "@/hooks/useSseStream";
import { endpoints } from "@/services/endpoints";
import {
  fetchCurveQuotes,
  fetchFxQuotes,
  fetchProviderQuotes,
} from "@/services/providerQuotesService";
import type { ProviderQuoteEvent } from "@/services/providerQuotesTypes";
import type { SseStatus } from "@/services/sseClient";
import {
  QUOTE_REFRESH_MS,
  type QuoteSource,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

interface UseTicketQuotesArgs {
  symbol: string;
  assetClass: string;
  source: QuoteSource;
}

interface UseTicketQuotesResult {
  quotes: ProviderQuoteEvent[];
  snapshotLoading: boolean;
  streamStatus: SseStatus;
  streamEnabled: boolean;
}

export function useTicketQuotes({
  symbol,
  assetClass,
  source,
}: UseTicketQuotesArgs): UseTicketQuotesResult {
  const streamEnabled = source === "stream" || source === "polled-stream";
  const polled = source !== "stream";
  const { events: quoteEvents, status: streamStatus } =
    useSseStream<ProviderQuoteEvent>(endpoints.providerQuotes.stream, {
      eventName: "quote",
      maxEvents: 200,
      enabled: streamEnabled,
    });

  const [snapshotQuotes, setSnapshotQuotes] = useState<ProviderQuoteEvent[]>(
    [],
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setSnapshotQuotes([]);
      return;
    }
    let cancelled = false;
    const load = () => {
      setSnapshotLoading(true);
      const request =
        source === "fx"
          ? fetchFxQuotes(symbol)
          : source === "curve"
            ? fetchCurveQuotes(symbol, assetClass)
            : fetchProviderQuotes(symbol, assetClass);
      request
        .then((rows) => {
          if (!cancelled) setSnapshotQuotes(rows);
        })
        .catch(() => {
          if (!cancelled) setSnapshotQuotes([]);
        })
        .finally(() => {
          if (!cancelled) setSnapshotLoading(false);
        });
    };
    load();
    if (!polled) {
      return () => {
        cancelled = true;
      };
    }
    const id = window.setInterval(load, QUOTE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [symbol, assetClass, source, polled]);

  const quotes = useMemo(() => {
    const merged = new Map<string, ProviderQuoteEvent>();
    for (const row of snapshotQuotes) {
      if (row.symbol === symbol && row.asset_class === assetClass) {
        merged.set(row.provider, row);
      }
    }
    if (streamEnabled) {
      const seenLive = new Set<string>();
      for (const event of quoteEvents) {
        if (event.symbol !== symbol || event.asset_class !== assetClass) {
          continue;
        }
        if (seenLive.has(event.provider)) continue;
        seenLive.add(event.provider);
        merged.set(event.provider, event);
      }
    }
    return Array.from(merged.values()).sort((a, b) =>
      a.provider.localeCompare(b.provider),
    );
  }, [snapshotQuotes, quoteEvents, symbol, assetClass, streamEnabled]);

  return { quotes, snapshotLoading, streamStatus, streamEnabled };
}
