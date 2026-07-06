export type SseStatus =
  | "CONNECTING"
  | "CONNECTED"
  | "RECONNECTING"
  | "ERROR";

export interface SseHandlers<T> {
  onMessage: (data: T) => void;
  onStatusChange?: (status: SseStatus) => void;
  onError?: (event: Event) => void;
  eventName?: string;
}

/**
 * Thin wrapper around the native EventSource. Returns a disposer that closes
 * the connection. Parsing is centralized here so views receive typed data.
 */
export function openSseStream<T>(url: string, handlers: SseHandlers<T>): () => void {
  const source = new EventSource(url);
  handlers.onStatusChange?.("CONNECTING");

  source.onopen = () => handlers.onStatusChange?.("CONNECTED");

  const handleEvent = (event: MessageEvent) => {
    try {
      handlers.onMessage(JSON.parse(event.data) as T);
    } catch {
      // Ignore non-JSON keep-alive comments / malformed frames.
    }
  };

  if (handlers.eventName) {
    source.addEventListener(handlers.eventName, handleEvent as EventListener);
  } else {
    source.onmessage = handleEvent;
  }

  source.onerror = (event) => {
    // EventSource auto-reconnects; surface the transient state to the UI.
    handlers.onStatusChange?.(
      source.readyState === EventSource.CLOSED ? "ERROR" : "RECONNECTING",
    );
    handlers.onError?.(event);
  };

  return () => source.close();
}
