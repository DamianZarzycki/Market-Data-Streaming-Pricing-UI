import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/cn";
import type { IrsDirection, IrsOpenTradePayload } from "@/services/tradeActionTypes";
import { formatPrice } from "@/views/MarketDataView/formatters";
import { QuoteComparisonTable } from "@/views/TradeGenerationView/tradeTicket/QuoteComparisonTable";
import { SummaryBar } from "@/views/TradeGenerationView/tradeTicket/SummaryBar";
import type { TradeFormProps, TradeTicketDraft } from "@/views/TradeGenerationView/tradeTicket/types";
import { useQuoteSelection } from "@/views/TradeGenerationView/tradeTicket/useQuoteSelection";
import { useTicketQuotes } from "@/views/TradeGenerationView/tradeTicket/useTicketQuotes";
import {
  decimalRateToPercentInput,
  irsCurrency,
  newTicketRequestId,
  ticketInputClass,
  toReferenceTimestamp,
  YIELD_PROVIDERS,
} from "@/views/TradeGenerationView/tradeTicket/quoteModel";

function TicketSuffixedInput({
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { suffix: string }) {
  return (
    <div className="relative">
      <input
        {...props}
        className={cn(ticketInputClass, "w-full pr-12", className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-text-muted">
        {suffix}
      </span>
    </div>
  );
}

const PAYMENTS = ["1", "2", "4", "12"] as const;

function sideFor(direction: IrsDirection): "BUY" | "SELL" {
  return direction === "RECEIVE_FIXED_PAY_FLOAT" ? "BUY" : "SELL";
}

export function IrsTradeForm({
  book,
  symbolMap,
  nowMs,
  onDraftChange,
}: TradeFormProps) {
  const symbols = symbolMap.IRS;
  const [symbol, setSymbol] = useState(symbols[0] ?? "");
  const [notional, setNotional] = useState("1000000");
  const [fixedRate, setFixedRate] = useState("");
  const [fixedRateEdited, setFixedRateEdited] = useState(false);
  const [maturity, setMaturity] = useState("0");
  const [payments, setPayments] = useState<(typeof PAYMENTS)[number]>("1");
  const [direction, setDirection] = useState<IrsDirection>(
    "RECEIVE_FIXED_PAY_FLOAT",
  );

  useEffect(() => {
    setSymbol(symbols[0] ?? "");
  }, [symbols]);

  useEffect(() => {
    setMaturity("0");
    setFixedRate("");
    setFixedRateEdited(false);
  }, [symbol]);

  const { quotes, snapshotLoading } = useTicketQuotes({
    symbol,
    assetClass: "IRS",
    source: "curve",
  });
  const selection = useQuoteSelection({
    quotes,
    providers: YIELD_PROVIDERS,
    symbol,
    assetClass: "IRS",
    nowMs,
    source: "curve",
  });

  useEffect(() => {
    if (fixedRateEdited) return;
    if (selection.referencePrice == null) return;
    setFixedRate(decimalRateToPercentInput(selection.referencePrice));
  }, [fixedRateEdited, selection.referencePrice, symbol]);

  const currency = irsCurrency(symbol) ?? selection.selectedQuote?.currency ?? "";
  const notionalValue = Number(notional);
  const fixedRatePercent = Number(fixedRate);
  const fixedRateValue = fixedRatePercent / 100;
  const maturityValue = Number(maturity);
  const paymentsValue = Number(payments);

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
      !!currency &&
      Number.isFinite(notionalValue) &&
      notionalValue > 0 &&
      Number.isFinite(fixedRatePercent) &&
      fixedRatePercent >= 0 &&
      Number.isFinite(maturityValue) &&
      maturityValue > 0 &&
      paymentsValue > 0;
    if (!ready || !selection.selectedQuote || selection.referencePrice == null) {
      return { ...base, canSubmit: false, payload: null };
    }
    const payload: IrsOpenTradePayload = {
      action_type: "OPEN_TRADE",
      client_request_id: newTicketRequestId(),
      book_id: book.book_id,
      asset_class: "IRS",
      symbol,
      side: sideFor(direction),
      quantity: 1,
      trade_price: 0,
      currency,
      market_data_provider: selection.selectedQuote.provider,
      reference_price: selection.referencePrice,
      reference_price_timestamp: toReferenceTimestamp(
        selection.selectedQuote.provider_timestamp ??
          selection.selectedQuote.received_at,
      ),
      source: "TRADING_TICKET",
      notional: notionalValue,
      fixed_rate: fixedRateValue,
      maturity_years: maturityValue,
      payments_per_year: paymentsValue,
      direction,
    };
    return { ...base, canSubmit: true, payload };
  }, [
    book.book_id,
    currency,
    direction,
    fixedRatePercent,
    fixedRateValue,
    maturityValue,
    notionalValue,
    paymentsValue,
    selection.referencePrice,
    selection.selectedProviderLabel,
    selection.selectedQuote,
    selection.selectedStatus,
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
        <Field label="Notional">
          <TicketSuffixedInput
            type="number"
            lang="en"
            min={1}
            step={1000}
            value={notional}
            suffix={currency || "—"}
            onChange={(event) => setNotional(event.target.value)}
          />
        </Field>
        <Field label="Fixed rate">
          <TicketSuffixedInput
            type="number"
            lang="en"
            min={0}
            step={0.01}
            value={fixedRate}
            suffix="%"
            onChange={(event) => {
              setFixedRateEdited(true);
              setFixedRate(event.target.value);
            }}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Maturity (years)">
          <input
            type="number"
            lang="en"
            min={0}
            step={0.5}
            value={maturity}
            onChange={(event) => setMaturity(event.target.value)}
            className={ticketInputClass}
          />
        </Field>
        <Field label="Payments / year">
          <Select
            value={payments}
            onChange={(event) =>
              setPayments(event.target.value as (typeof PAYMENTS)[number])
            }
            className="bg-bg"
          >
            {PAYMENTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Direction">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={
                direction === "RECEIVE_FIXED_PAY_FLOAT" ? "primary" : "secondary"
              }
              className="flex-1 justify-center"
              onClick={() => setDirection("RECEIVE_FIXED_PAY_FLOAT")}
            >
              Receive fixed
            </Button>
            <Button
              type="button"
              variant={
                direction === "PAY_FIXED_RECEIVE_FLOAT" ? "primary" : "secondary"
              }
              className="flex-1 justify-center"
              onClick={() => setDirection("PAY_FIXED_RECEIVE_FLOAT")}
            >
              Pay fixed
            </Button>
          </div>
        </Field>
      </div>

      <p className="text-sm text-text-muted">
        Booked as {sideFor(direction)}. Swap PV starts near zero when the fixed
        rate matches the selected curve tenor. Pricing uses the full yield curve,
        notional, rate, maturity and payment frequency.
      </p>

      <SummaryBar
        label="Notional"
        value={
          Number.isFinite(notionalValue) && notionalValue > 0
            ? formatPrice(notionalValue, currency, 2)
            : null
        }
        empty="enter a notional"
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Curve reference</h3>
            <p className="text-sm text-text-muted">
              FRED · ECB · the selected tenor is the reference rate stored on
              the trade. Refreshed every 30s from GET /market-data/curve-quotes.
            </p>
          </div>
          <StatusPill tone={snapshotLoading ? "stale" : "live"}>
            {snapshotLoading ? "LOADING" : "REST"}
          </StatusPill>
        </div>
        <QuoteComparisonTable
          symbol={symbol}
          assetClass="IRS"
          providers={YIELD_PROVIDERS}
          quoteByProvider={selection.quoteByProvider}
          statusOf={selection.statusOf}
          selectedProvider={selection.selectedProvider}
          onSelect={selection.setSelectedProvider}
          snapshotLoading={snapshotLoading}
          nowMs={nowMs}
          emptyMessage={
            symbols.length === 0
              ? "No symbols configured for IRS."
              : "Select a symbol to compare curve tenors."
          }
        />
      </section>
    </>
  );
}
