export function pnlClass(value: number | undefined | null): string {
  if (value === undefined || value === null || value === 0) return "";
  return value > 0 ? "text-positive" : "text-negative";
}
