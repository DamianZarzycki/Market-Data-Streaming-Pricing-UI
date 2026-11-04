export type SseStatus =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

export interface SseHandlers<T> {
  onMessage: (data: T) => void;
  onStatusChange?: (status: SseStatus) => void;
  /** Frames seen by the shared EventSource (connection-level, not per tab). */
  onReceivedCount?: (count: number) => void;
  onError?: (event: Event) => void;
  eventName?: string;
}

const RECONNECT_MS = 1_000;

/**
 * Thin wrapper around the native EventSource. Returns a disposer that closes
 * the connection. Parsing is centralized here so views receive typed data.
 *
 * The browser retries a dropped socket by itself. It does not retry when the
 * response is not 200 text/event-stream — readyState becomes CLOSED. This
 * opens a new EventSource in that case so the pill does not stay OFFLINE.
 */
export function openSseStream<T>(url: string, handlers: SseHandlers<T>): () => void {
  let source: EventSource | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const handleEvent = (event: MessageEvent) => {
    try {
      handlers.onMessage(JSON.parse(event.data) as T);
    } catch {
      // Ignore non-JSON keep-alive comments / malformed frames.
    }
  };

  const attach = (next: EventSource) => {
    source = next;
    next.onopen = () => handlers.onStatusChange?.("CONNECTED");

    if (handlers.eventName) {
      next.addEventListener(handlers.eventName, handleEvent as EventListener);
    } else {
      next.onmessage = handleEvent;
    }

    next.onerror = (event) => {
      handlers.onError?.(event);
      if (closed || source !== next) return;
      handlers.onStatusChange?.("RECONNECTING");
      if (next.readyState !== EventSource.CLOSED || reconnectTimer != null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (closed) return;
        attach(new EventSource(url));
      }, RECONNECT_MS);
    };
  };

  handlers.onStatusChange?.("CONNECTING");
  attach(new EventSource(url));

  return () => {
    closed = true;
    if (reconnectTimer != null) clearTimeout(reconnectTimer);
    source?.close();
  };
}
