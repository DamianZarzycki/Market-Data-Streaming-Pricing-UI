import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import type { EuropeanOptionOpenTradePayload } from "@/services/tradeActionTypes";
import { formatPrice } from "@/views/MarketDataView/formatters";
import { europeanOptionPremium } from "@/views/TradeGenerationView/tradeTicket/europeanOptionPrice";
import { QuoteComparisonTable } from "@/views/TradeGenerationView/tradeTicket/QuoteComparisonTable";
import { SideToggle } from "@/views/TradeGenerationView/tradeTicket/SideToggle";
import { SummaryBar } from "@/views/TradeGenerationView/tradeTicket/SummaryBar";
import type { TradeFormProps, TradeTicketDraft } from "@/views/TradeGenerationView/tradeTicket/types";
import { useQuoteSelection } from "@/views/TradeGenerationView/tradeTicket/useQuoteSelection";
import { useTicketQuotes } from "@/views/TradeGenerationView/tradeTicket/useTicketQuotes";
import {
  EQUITY_PROVIDERS,
  exitPriceOf,
  newTicketRequestId,
  ticketInputClass,
  toReferenceTimestamp,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

type OptionRight = "CALL" | "PUT";

function roundPremium(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function EuropeanOptionTradeForm({
  book,
  symbolMap,
  nowMs,
  onDraftChange,
}: TradeFormProps) {
  const symbols = symbolMap.EQUITY;
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState("1");
  const [right, setRight] = useState<OptionRight>("CALL");
  const [strike, setStrike] = useState("");
  const [strikeEdited, setStrikeEdited] = useState(false);
  const strikeSeeded = useRef(false);
  const [maturity, setMaturity] = useState("0");
  const [volatility, setVolatility] = useState("0");

  useEffect(() => {
    setSymbol(symbols[0] ?? "");
  }, [symbols]);

  useEffect(() => {
    strikeSeeded.current = false;
    setStrikeEdited(false);
    setStrike("");
  }, [symbol]);

  const { quotes, snapshotLoading, streamStatus } = useTicketQuotes({
    symbol,
    assetClass: "EQUITY",
    source: "stream",
  });
  const selection = useQuoteSelection({
    quotes,
    providers: EQUITY_PROVIDERS,
    symbol,
    assetClass: "EQUITY",
    nowMs,
    source: "stream",
  });

  const spot = exitPriceOf(selection.selectedQuote, side);

  useEffect(() => {
    if (strikeEdited || strikeSeeded.current) return;
    if (spot == null) return;
    strikeSeeded.current = true;
    setStrike(String(spot));
  }, [spot, strikeEdited, symbol]);

  const quantityValue = Number(quantity);
  const strikeValue = Number(strike);
  const maturityValue = Number(maturity);
  const volatilityValue = Number(volatility);
  const premium =
    spot != null
      ? europeanOptionPremium({
          spot,
          strike: strikeValue,
          volatility: volatilityValue,
          maturityYears: maturityValue,
          right,
        })
      : null;
  const optionPrice = premium != null ? roundPremium(premium) : null;

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
      spot != null &&
      optionPrice != null &&
      optionPrice >= 0 &&
      !!selection.currency &&
      Number.isFinite(quantityValue) &&
      quantityValue > 0 &&
      Number.isFinite(strikeValue) &&
      strikeValue > 0 &&
      Number.isFinite(maturityValue) &&
      maturityValue > 0 &&
      Number.isFinite(volatilityValue) &&
      volatilityValue > 0;
    if (
      !ready ||
      !selection.selectedQuote ||
      spot == null ||
      optionPrice == null
    ) {
      return { ...base, canSubmit: false, payload: null };
    }
    const payload: EuropeanOptionOpenTradePayload = {
      action_type: "OPEN_TRADE",
      client_request_id: newTicketRequestId(),
      book_id: book.book_id,
      asset_class: "OPTION",
      symbol,
      side,
      quantity: quantityValue,
      trade_price: optionPrice,
      currency: selection.currency,
      market_data_provider: selection.selectedQuote.provider,
      reference_price: spot,
      reference_price_timestamp: toReferenceTimestamp(
        selection.selectedQuote.provider_timestamp ??
          selection.selectedQuote.received_at,
      ),
      source: "TRADING_TICKET",
      option_type: "EUROPEAN",
      option_right_type: right,
      strike: strikeValue,
      maturity_years: maturityValue,
      volatility: volatilityValue,
      option_price: optionPrice,
      spot,
    };
    return { ...base, canSubmit: true, payload };
  }, [
    book.book_id,
    maturityValue,
    optionPrice,
    quantityValue,
    right,
    selection.currency,
    selection.selectedProviderLabel,
    selection.selectedQuote,
    selection.selectedStatus,
    side,
    spot,
    strikeValue,
    symbol,
    volatilityValue,
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
        <Field label="Underlying">
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

      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Right">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={right === "CALL" ? "primary" : "secondary"}
              className="flex-1 justify-center"
              onClick={() => setRight("CALL")}
            >
              CALL
            </Button>
            <Button
              type="button"
              variant={right === "PUT" ? "primary" : "secondary"}
              className="flex-1 justify-center"
              onClick={() => setRight("PUT")}
            >
              PUT
            </Button>
          </div>
        </Field>
        <Field label="Strike">
          <input
            type="number"
            lang="en"
            min={0.01}
            step={0.01}
            value={strike}
            onChange={(event) => {
              setStrikeEdited(true);
              setStrike(event.target.value);
            }}
            className={ticketInputClass}
          />
        </Field>
        <Field label="Maturity (years)">
          <input
            type="number"
            lang="en"
            min={0}
            step={0.25}
            value={maturity}
            onChange={(event) => setMaturity(event.target.value)}
            className={ticketInputClass}
          />
        </Field>
        <Field label="Volatility">
          <input
            type="number"
            lang="en"
            min={0}
            step={0.01}
            value={volatility}
            onChange={(event) => setVolatility(event.target.value)}
            placeholder="0.2 = 20%"
            className={ticketInputClass}
          />
        </Field>
      </div>

      <p className="text-sm text-text-muted">
        European option. Spot is the selected equity quote. Set maturity and
        volatility above zero before saving. Premium is Black-Scholes with
        zero rates, and that premium is the trade price.
      </p>

      <SummaryBar
        label="Premium"
        value={
          optionPrice != null
            ? formatPrice(optionPrice, selection.currency, 4)
            : null
        }
        empty="select a row to price it"
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Underlying quotes</h3>
            <p className="text-sm text-text-muted">
              Alpha Vantage · Finnhub · Twelve Data · the row you pick is the
              spot for this option.
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
              ? "No equity symbols configured."
              : "Select an underlying to compare quotes."
          }
        />
      </section>
    </>
  );
}
