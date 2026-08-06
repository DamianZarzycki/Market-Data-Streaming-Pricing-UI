export function formatLatency(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1) return "<1 ms";
  return `${Math.round(ms)} ms`;
}

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

export function shortenRequestId(id: string | null | undefined): string {
  if (!id || id === "—") return "—";
  if (id.length <= 12) return id;
  return `req-…${id.slice(-4)}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-US");
}
