import { useEffect, useRef, useState } from "react";
import { openSharedSseStream } from "@/services/sharedSseClient";
import type { SseStatus } from "@/services/sseClient";

interface UseSseStreamOptions {
  eventName?: string;
  maxEvents?: number;
  enabled?: boolean;
}

interface UseSseStreamResult<T> {
  events: T[];
  status: SseStatus;
  clear: () => void;
}

/**
 * Subscribe to an SSE endpoint and keep a bounded, most-recent-first buffer.
 * The buffer cap prevents unbounded memory growth on high-frequency streams.
 */
export function useSseStream<T>(
  url: string,
  { eventName, maxEvents = 50, enabled = true }: UseSseStreamOptions = {},
): UseSseStreamResult<T> {
  const [events, setEvents] = useState<T[]>([]);
  const [status, setStatus] = useState<SseStatus>("CONNECTING");
  const maxEventsRef = useRef(maxEvents);
  maxEventsRef.current = maxEvents;

  useEffect(() => {
    if (!enabled) return;

    const dispose = openSharedSseStream<T>(url, {
      eventName,
      onStatusChange: setStatus,
      onMessage: (data) =>
        setEvents((current) =>
          [data, ...current].slice(0, maxEventsRef.current),
        ),
    });

    return dispose;
  }, [url, eventName, enabled]);

  const clear = () => setEvents([]);

  return { events, status, clear };
}
