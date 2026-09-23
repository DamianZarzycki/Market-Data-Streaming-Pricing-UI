import { useEffect, useMemo, useState } from "react";
import { Field, Select } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import type { SpotOpenTradePayload } from "@/services/tradeActionTypes";
import { formatPrice } from "@/views/MarketDataView/formatters";
import { QuoteComparisonTable } from "@/views/TradeGenerationView/tradeTicket/QuoteComparisonTable";
import { SideToggle } from "@/views/TradeGenerationView/tradeTicket/SideToggle";
import { SummaryBar } from "@/views/TradeGenerationView/tradeTicket/SummaryBar";
import type { TradeFormProps, TradeTicketDraft } from "@/views/TradeGenerationView/tradeTicket/types";
import { useQuoteSelection } from "@/views/TradeGenerationView/tradeTicket/useQuoteSelection";
import { useTicketQuotes } from "@/views/TradeGenerationView/tradeTicket/useTicketQuotes";
import {
  newTicketRequestId,
  ticketInputClass,
  toReferenceTimestamp,
  type QuoteSource,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

interface SpotTradeFormProps extends TradeFormProps {
  assetClass: SpotOpenTradePayload["asset_class"];
  symbols: string[];
  providers: { key: string; label: string }[];
  source: QuoteSource;
  tableHint: string;
}

export function SpotTradeForm({
  book,
  nowMs,
  onDraftChange,
  assetClass,
  symbols,
  providers,
  source,
  tableHint,
}: SpotTradeFormProps) {
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("100");

  useEffect(() => {
    setSymbol(symbols[0] ?? "");
  }, [symbols]);

  const { quotes, snapshotLoading, streamStatus, streamEnabled } = useTicketQuotes({
    symbol,
    assetClass,
    source,
  });
  const selection = useQuoteSelection({
    quotes,
    providers,
    symbol,
    assetClass,
    nowMs,
    source,
  });

  const quantityValue = Number(quantity);
  const notional =
    selection.referencePrice != null &&
    Number.isFinite(quantityValue) &&
    quantityValue > 0
      ? quantityValue * selection.referencePrice
      : null;

  const draft = useMemo<TradeTicketDraft>(() => {
    const base = {
      status: selection.selectedStatus,
      providerLabel: selection.selectedProviderLabel,
      symbol,
      quote: selection.selectedQuote,
    };
    const ready =
      !!symbol &&
      selection.selectedStatus !== "MISSING" &&
      !!selection.selectedQuote &&
      selection.referencePrice != null &&
      !!selection.currency &&
      Number.isFinite(quantityValue) &&
      quantityValue > 0;
    if (!ready || !selection.selectedQuote || selection.referencePrice == null) {
      return { ...base, canSubmit: false, payload: null };
    }
    const payload: SpotOpenTradePayload = {
      action_type: "OPEN_TRADE",
      client_request_id: newTicketRequestId(),
      book_id: book.book_id,
      asset_class: assetClass,
      symbol,
      side,
      quantity: quantityValue,
      trade_price: selection.referencePrice,
      currency: selection.currency,
      market_data_provider: selection.selectedQuote.provider,
      reference_price: selection.referencePrice,
      reference_price_timestamp: toReferenceTimestamp(
        selection.selectedQuote.provider_timestamp ??
          selection.selectedQuote.received_at,
      ),
      source: "TRADING_TICKET",
    };
    return { ...base, canSubmit: true, payload };
  }, [
    assetClass,
    book.book_id,
    quantityValue,
    selection.currency,
    selection.referencePrice,
    selection.selectedProviderLabel,
    selection.selectedQuote,
    selection.selectedStatus,
    side,
    symbol,
  ]);

  useEffect(() => {
    onDraftChange(draft);
  }, [draft, onDraftChange]);

  useEffect(() => {
    return () => onDraftChange(null);
  }, [onDraftChange]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Symbol">
          <Select
            value={symbol}
            disabled={symbols.length === 0}
            onChange={(event) => setSymbol(event.target.value)}
            className="bg-bg"
          >
            {symbols.length === 0 ? (
              <option value="">No symbols</option>
            ) : (
              symbols.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            )}
          </Select>
        </Field>
        <SideToggle side={side} onChange={setSide} />
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={ticketInputClass}
          />
        </Field>
      </div>

      <Field label="Currency">
        <input
          type="text"
          value={selection.selectedQuote ? selection.currency : ""}
          disabled
          placeholder="select a row"
          className={ticketInputClass}
        />
      </Field>

      <SummaryBar
        label="Notional"
        value={
          notional != null ? formatPrice(notional, selection.currency, 2) : null
        }
        empty="select a row to price it"
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Market data comparison</h3>
            <p className="text-sm text-text-muted">{tableHint}</p>
          </div>
          {streamEnabled ? (
            <StatusPill tone={streamTone(streamStatus, false, false)}>
              {streamLabel(streamStatus, false, false)}
            </StatusPill>
          ) : (
            <StatusPill tone={snapshotLoading ? "stale" : "live"}>
              {snapshotLoading ? "LOADING" : "REST"}
            </StatusPill>
          )}
        </div>
        <QuoteComparisonTable
          symbol={symbol}
          providers={providers}
          quoteByProvider={selection.quoteByProvider}
          statusOf={selection.statusOf}
          selectedProvider={selection.selectedProvider}
          onSelect={selection.setSelectedProvider}
          snapshotLoading={snapshotLoading}
          nowMs={nowMs}
          emptyMessage={
            symbols.length === 0
              ? `No symbols configured for ${assetClass}.`
              : "Select a symbol to compare quotes."
          }
        />
      </section>
    </>
  );
}
