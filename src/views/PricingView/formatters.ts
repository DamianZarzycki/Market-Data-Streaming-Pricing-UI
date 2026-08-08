export {
  formatNumber,
  pnlClass,
} from "@/views/BlotterView/formatters";

/** Clock time with optional milliseconds for valuation timestamps. */
export function formatClock(
  value: string | undefined | null,
  withMs = false,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    ...(withMs ? { fractionalSecondDigits: 3 } : {}),
    hour12: false,
  });
}

export function formatAge(ageMs: number): string {
  const totalSec = Math.max(0, Math.floor(ageMs / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatFairValue(
  value: number | null | undefined,
  currency?: string | null,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const amount = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${amount} ${currency}` : amount;
}

export function formatPnl(
  value: number | undefined | null,
  currency?: string | null,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const absolute = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  if (currency) {
    return `${sign}${absolute} ${currency}`;
  }
  // Aggregate / unknown currency — keep a generic money marker.
  return `${sign}$${absolute}`;
}

export function formatAlphaBeta(
  alpha: number | null | undefined,
  beta: number | null | undefined,
): string {
  if (
    (alpha === undefined || alpha === null) &&
    (beta === undefined || beta === null)
  ) {
    return "—";
  }
  const a =
    alpha === undefined || alpha === null
      ? "—"
      : alpha.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  const b =
    beta === undefined || beta === null
      ? "—"
      : beta.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${a} / ${b}`;
}
