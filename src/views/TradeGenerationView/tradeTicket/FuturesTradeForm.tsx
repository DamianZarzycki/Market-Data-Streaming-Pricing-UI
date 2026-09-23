import { useEffect, useMemo, useState } from "react";
import { Field, Select } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import type { FuturesOpenTradePayload } from "@/services/tradeActionTypes";
import { formatPrice } from "@/views/MarketDataView/formatters";
import { QuoteComparisonTable } from "@/views/TradeGenerationView/tradeTicket/QuoteComparisonTable";
import { SideToggle } from "@/views/TradeGenerationView/tradeTicket/SideToggle";
import { SummaryBar } from "@/views/TradeGenerationView/tradeTicket/SummaryBar";
import type { TradeFormProps, TradeTicketDraft } from "@/views/TradeGenerationView/tradeTicket/types";
import { useQuoteSelection } from "@/views/TradeGenerationView/tradeTicket/useQuoteSelection";
import { useTicketQuotes } from "@/views/TradeGenerationView/tradeTicket/useTicketQuotes";
import {
  EQUITY_PROVIDERS,
  newTicketRequestId,
  ticketInputClass,
  toReferenceTimestamp,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

export function FuturesTradeForm({
  book,
  symbolMap,
  nowMs,
  onDraftChange,
}: TradeFormProps) {
  const symbols = symbolMap.FUTURES;
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    setSymbol(symbols[0] ?? "");
  }, [symbols]);

  const contract = symbolMap.FUTURES_CONTRACTS[symbol] ?? null;

  const { quotes, snapshotLoading, streamStatus } = useTicketQuotes({
    symbol,
    assetClass: "FUTURES",
    source: "polled-stream",
  });
  const selection = useQuoteSelection({
    quotes,
    providers: EQUITY_PROVIDERS,
    symbol,
    assetClass: "FUTURES",
    nowMs,
    source: "polled-stream",
  });

  const quantityValue = Number(quantity);
  const multiplier = contract?.multiplier ?? null;
  const notional =
    selection.referencePrice != null &&
    multiplier != null &&
    multiplier > 0 &&
    Number.isFinite(quantityValue) &&
    quantityValue > 0
      ? quantityValue * selection.referencePrice * multiplier
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
      !!contract &&
      contract.multiplier > 0 &&
      !!contract.underlying &&
      selection.selectedStatus !== "MISSING" &&
      !!selection.selectedQuote &&
      selection.referencePrice != null &&
      !!selection.currency &&
      Number.isFinite(quantityValue) &&
      quantityValue > 0;
    if (
      !ready ||
      !selection.selectedQuote ||
      selection.referencePrice == null ||
      !contract
    ) {
      return { ...base, canSubmit: false, payload: null };
    }
    const payload: FuturesOpenTradePayload = {
      action_type: "OPEN_TRADE",
      client_request_id: newTicketRequestId(),
      book_id: book.book_id,
      asset_class: "FUTURES",
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
      contract_multiplier: contract.multiplier,
      underlying_symbol: contract.underlying,
    };
    return { ...base, canSubmit: true, payload };
  }, [
    book.book_id,
    contract,
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
        <Field label="Contract">
          <Select
            value={symbol}
            disabled={symbols.length === 0}
            onChange={(event) => setSymbol(event.target.value)}
            className="bg-bg"
          >
            {symbols.length === 0 ? (
              <option value="">No contracts</option>
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Underlying">
          <input
            type="text"
            value={contract?.underlying ?? ""}
            disabled
            placeholder="—"
            className={ticketInputClass}
          />
        </Field>
        <Field label="Contract multiplier">
          <input
            type="text"
            value={multiplier != null ? String(multiplier) : ""}
            disabled
            placeholder="—"
            className={ticketInputClass}
          />
        </Field>
      </div>

      <p className="text-sm text-text-muted">
        Price tracks the linked ETF quote. Value is price × multiplier ×
        quantity. This is not an exchange futures chain.
      </p>

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
            <h3 className="text-base font-semibold">Futures quotes</h3>
            <p className="text-sm text-text-muted">
              Alpha Vantage · Finnhub · Twelve Data · copied from the underlying
              ETF whenever that equity quote is saved.
            </p>
          </div>
          <StatusPill tone={streamTone(streamStatus, false, false)}>
            {streamLabel(streamStatus, false, false)}
          </StatusPill>
        </div>
        <QuoteComparisonTable
          symbol={symbol}
          providers={EQUITY_PROVIDERS}
          quoteByProvider={selection.quoteByProvider}
          statusOf={selection.statusOf}
          selectedProvider={selection.selectedProvider}
          onSelect={selection.setSelectedProvider}
          snapshotLoading={snapshotLoading}
          nowMs={nowMs}
          emptyMessage={
            symbols.length === 0
              ? "No futures contracts configured."
              : "Select a contract to compare quotes."
          }
        />
      </section>
    </>
  );
}
