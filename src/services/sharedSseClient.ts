import { openSseStream, type SseHandlers } from "@/services/sseClient";
import type { SharedSseOutbound } from "@/workers/sharedSseProtocol";

function eventNamesMatch(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}

/** New name + query so a browser drops a SharedWorker that still holds a dead EventSource. */
const SSE_WORKER_NAME = "trading-sse-v2";

export function openSseWorker(): SharedWorker {
  const url = new URL("../workers/shared-worker.ts", import.meta.url);
  url.searchParams.set("v", "2");
  return new SharedWorker(url, { type: "module", name: SSE_WORKER_NAME });
}

function connectViaWorker<T>(url: string, handlers: SseHandlers<T>): () => void {
  const eventName = handlers.eventName;
  const worker = openSseWorker();
  const port = worker.port;
  let closed = false;
  let fallbackStop: (() => void) | null = null;

  handlers.onStatusChange?.("CONNECTING");

  port.onmessage = (event: MessageEvent<SharedSseOutbound>) => {
    if (closed || fallbackStop) return;
    const payload = event.data;
    if (!payload || payload.type === "shutdown") return;
    if (payload.url !== url) return;
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
    if (closed || fallbackStop) return;
    try {
      port.postMessage({ type: "unsubscribe", url, eventName });
    } catch {
      // The worker is already gone.
    }
    try {
      port.close();
    } catch {
      // The port may already be closing.
    }
    fallbackStop = openSseStream(url, handlers);
  };

  port.start();
  port.postMessage({ type: "subscribe", url, eventName });

  return () => {
    if (closed) return;
    closed = true;
    if (fallbackStop) {
      fallbackStop();
      return;
    }
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
