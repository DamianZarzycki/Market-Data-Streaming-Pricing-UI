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

export function formatPrice(
  value: number | null | undefined,
  currency?: string | null,
  digits = 4,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
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
