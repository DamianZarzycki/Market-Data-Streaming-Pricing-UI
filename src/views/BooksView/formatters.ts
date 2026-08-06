export function formatPnl(value: number | null | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  const absolute = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${absolute}`;
}

export function formatNumber(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}
