import type { ProviderQuoteEvent } from "@/services/providerQuotesTypes";

export const STALE_MS = 20_000;
export const CURVE_STALE_MS = 36 * 60 * 60 * 1000;
export const QUOTE_REFRESH_MS = 30_000;

export const ticketInputClass =
  "rounded border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none disabled:opacity-60";

export const EQUITY_PROVIDERS: { key: string; label: string }[] = [
  { key: "ALPHA_VANTAGE", label: "Alpha Vantage" },
  { key: "FINNHUB", label: "Finnhub" },
  { key: "TWELVE_DATA", label: "Twelve Data" },
];

export const FX_PROVIDERS: { key: string; label: string }[] = [
  { key: "NBP", label: "NBP" },
  { key: "ECB", label: "ECB" },
  { key: "FRED", label: "FRED" },
];

export const YIELD_PROVIDERS: { key: string; label: string }[] = [
  { key: "FRED", label: "FRED" },
  { key: "ECB", label: "ECB" },
];

export type QuoteStatus = "LIVE" | "STALE" | "MISSING";

export type QuoteSource = "stream" | "polled-stream" | "fx" | "curve";

export function quoteStaleWindow(source: QuoteSource): number {
  return source === "fx" || source === "curve" ? CURVE_STALE_MS : STALE_MS;
}

export function referencePriceOf(
  quote: ProviderQuoteEvent | null,
): number | null {
  if (!quote) return null;
  const price = quote.last ?? quote.ask ?? quote.bid;
  return price == null ? null : price;
}

/** Mark convention: a long exits on the bid, a short on the ask, else last. */
export function exitPriceOf(
  quote: ProviderQuoteEvent | null,
  side: "BUY" | "SELL",
): number | null {
  if (!quote) return null;
  const price =
    side === "BUY" ? (quote.bid ?? quote.last) : (quote.ask ?? quote.last);
  return price == null ? null : price;
}

export function quoteStatusOf(
  quote: ProviderQuoteEvent | null,
  nowMs: number,
  staleMs: number,
): QuoteStatus {
  if (!quote) return "MISSING";
  if (!quote.provider_timestamp) return "STALE";
  const pricedAt = new Date(quote.provider_timestamp).getTime();
  if (Number.isNaN(pricedAt)) return "STALE";
  return nowMs - pricedAt < staleMs ? "LIVE" : "STALE";
}

export function toReferenceTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function newTicketRequestId(): string {
  return `ticket-${crypto.randomUUID()}`;
}

export function formatRelative(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const deltaSec = Math.max(0, Math.round((nowMs - then) / 1000));
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const min = Math.floor(deltaSec / 60);
  if (min < 60) return `${min}m ${deltaSec % 60}s ago`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours}h ${min % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

export function formatClockTime(iso: string | null, nowMs = Date.now()): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const now = new Date(nowMs);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return time;
  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  return `${day} ${time}`;
}

/** USD_5Y_IRS -> 5, EUR_10Y_IRS -> 10, USD_6M_IRS -> 0.5. */
export function irsMaturityYears(symbol: string): number | null {
  const match = symbol.toUpperCase().match(/_(\d+(?:\.\d+)?)([YM])_IRS$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2] === "M" ? amount / 12 : amount;
}

/** USD_5Y_IRS -> USD, EUR_10Y_IRS -> EUR. */
export function irsCurrency(symbol: string): string | null {
  const match = symbol.toUpperCase().match(/^([A-Z]{3})_/);
  return match?.[1] ?? null;
}

/** Curve last 0.0483 -> "4.83" for a percent input. */
export function decimalRateToPercentInput(decimal: number): string {
  return String(Math.round(decimal * 100 * 1_000_000) / 1_000_000);
}

export function providerLabel(
  providers: { key: string; label: string }[],
  key: string | null,
): string | null {
  if (!key) return null;
  return providers.find((item) => item.key === key)?.label ?? key;
}
