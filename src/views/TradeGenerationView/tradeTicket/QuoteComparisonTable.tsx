import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/cn";
import type { ProviderQuoteEvent } from "@/services/providerQuotesTypes";
import { formatPrice } from "@/views/MarketDataView/formatters";
import {
  formatClockTime,
  formatRelative,
  type QuoteStatus,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

interface QuoteComparisonTableProps {
  symbol: string;
  providers: { key: string; label: string }[];
  quoteByProvider: Map<string, ProviderQuoteEvent>;
  statusOf: (quote: ProviderQuoteEvent | null) => QuoteStatus;
  selectedProvider: string | null;
  onSelect: (provider: string) => void;
  snapshotLoading: boolean;
  nowMs: number;
  emptyMessage: string;
  assetClass?: string;
}

export function QuoteComparisonTable({
  symbol,
  providers,
  quoteByProvider,
  statusOf,
  selectedProvider,
  onSelect,
  snapshotLoading,
  nowMs,
  emptyMessage,
  assetClass,
}: QuoteComparisonTableProps) {
  return (
    <div className="overflow-hidden rounded border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt text-left text-sm font-semibold uppercase tracking-[0.03em] text-text-muted">
            <th className="px-3 py-2">Provider</th>
            <th className="px-3 py-2">Symbol</th>
            <th className="px-3 py-2 text-right">Bid</th>
            <th className="px-3 py-2 text-right">Ask</th>
            <th className="px-3 py-2 text-right">Last</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Provider time</th>
          </tr>
        </thead>
        <tbody>
          {!symbol ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            providers.map(({ key, label }) => {
              const quote = quoteByProvider.get(key) ?? null;
              const status = statusOf(quote);
              const selectable = quote != null;
              const selected = selectable && key === selectedProvider;
              const marketIso = quote?.provider_timestamp ?? null;
              return (
                <tr
                  key={key}
                  aria-selected={selected}
                  aria-disabled={!selectable}
                  onClick={
                    selectable
                      ? () => {
                          onSelect(key);
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-border transition-colors last:border-b-0",
                    selectable
                      ? "cursor-pointer hover:bg-surface-alt"
                      : "cursor-not-allowed opacity-60",
                    selected && "bg-accent/20 hover:bg-accent/25",
                  )}
                >
                  <td className="px-3 py-2 font-semibold">{label}</td>
                  <td className="px-3 py-2">{symbol}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {quote
                      ? formatPrice(quote.bid, quote.currency, 4, assetClass)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {quote
                      ? formatPrice(quote.ask, quote.currency, 4, assetClass)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {quote
                      ? formatPrice(quote.last, quote.currency, 4, assetClass)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill tone={status === "MISSING" ? "error" : status}>
                      {status}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-2 font-mono text-sm tabular-nums text-text-muted">
                    {marketIso ? (
                      `${formatClockTime(marketIso, nowMs)} · ${formatRelative(marketIso, nowMs)}`
                    ) : snapshotLoading && !quote ? (
                      "loading…"
                    ) : quote ? (
                      "no provider time"
                    ) : (
                      "no data"
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
