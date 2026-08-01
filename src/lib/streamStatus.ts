import type { SseStatus } from "@/services/sseClient";

export function streamTone(
  status: SseStatus,
  hasError: boolean,
  loading: boolean,
) {
  if (hasError) return "error" as const;
  if (loading) return "stale" as const;
  if (status === "CONNECTED") return "live" as const;
  if (status === "ERROR") return "error" as const;
  return "stale" as const;
}

export function streamLabel(
  status: SseStatus,
  hasError: boolean,
  loading: boolean,
) {
  if (hasError) return "ERROR";
  if (loading) return "LOADING";
  if (status === "CONNECTED") return "LIVE";
  if (status === "RECONNECTING") return "RECONNECTING";
  if (status === "CONNECTING") return "CONNECTING";
  return "OFFLINE";
}
