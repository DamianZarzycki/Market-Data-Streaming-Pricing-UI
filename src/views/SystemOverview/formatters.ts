export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatRelative(
  iso: string | null | undefined,
  nowMs = Date.now(),
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const deltaSec = Math.max(0, Math.round((nowMs - date.getTime()) / 1000));
  if (deltaSec < 5) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const mins = Math.floor(deltaSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return formatClock(iso);
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1) return "<1 ms";
  return `${Math.round(ms)} ms`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US");
}

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

export { pnlClass } from "@/components/ui/pnl";
