export { formatNumber } from "@/views/BlotterView/formatters";

/** Timestamp with millisecond precision for live market ticks. */
export function formatTimestamp(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
    timeZoneName: "short",
  });
}

/** IRS (and similar) quotes arrive as decimal rates, e.g. 0.0489 → 4.89%. */
export function isRateQuoted(dataClass?: string | null): boolean {
  return dataClass === "IRS";
}

/** Convert a decimal rate to percent units for chart axes / display math. */
export function rateToPercent(value: number): number {
  return value * 100;
}

export function formatRatePercent(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const pct = rateToPercent(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${pct}%`;
}

export function formatPrice(
  value: number | null | undefined,
  currency?: string | null,
  digits = 4,
  dataClass?: string | null,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  if (isRateQuoted(dataClass)) {
    return formatRatePercent(value);
  }
  const amount = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
  if (currency) {
    return `${amount} ${currency}`;
  }
  return amount;
}
