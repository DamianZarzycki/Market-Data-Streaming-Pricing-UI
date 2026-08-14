import { openSseStream, type SseHandlers } from "@/services/sseClient";
import type { SharedSseOutbound } from "@/workers/sharedSseProtocol";

function eventNamesMatch(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}

function connectViaWorker<T>(url: string, handlers: SseHandlers<T>): () => void {
  const eventName = handlers.eventName;
  const worker = new SharedWorker(
    new URL("../workers/shared-worker.ts", import.meta.url),
    { type: "module", name: "trading-sse" },
  );
  const port = worker.port;
  let closed = false;

  handlers.onStatusChange?.("CONNECTING");

  port.onmessage = (event: MessageEvent<SharedSseOutbound>) => {
    const payload = event.data;
    if (!payload || payload.url !== url) return;
    if (!eventNamesMatch(payload.eventName, eventName)) return;
    if (typeof payload.receivedCount === "number") {
      handlers.onReceivedCount?.(payload.receivedCount);
    }
    if (payload.type === "status") {
      handlers.onStatusChange?.(payload.status);
      return;
    }
    if (payload.type === "message") {
      handlers.onMessage(payload.data as T);
    }
  };

  worker.onerror = () => {
    if (closed) return;
    closed = true;
    port.close();
    handlers.onStatusChange?.("ERROR");
  };

  port.start();
  port.postMessage({ type: "subscribe", url, eventName });

  return () => {
    if (closed) return;
    closed = true;
    port.postMessage({ type: "unsubscribe", url, eventName });
    port.close();
  };
}

/**
 * Same contract as openSseStream, but EventSource lives in a SharedWorker
 * so multiple tabs share one connection per URL. Falls back to a direct
 * EventSource when SharedWorker is unavailable.
 */
export function openSharedSseStream<T>(
  url: string,
  handlers: SseHandlers<T>,
): () => void {
  if (typeof SharedWorker === "undefined") {
    return openSseStream(url, handlers);
  }
  try {
    return connectViaWorker(url, handlers);
  } catch {
    return openSseStream(url, handlers);
  }
}
