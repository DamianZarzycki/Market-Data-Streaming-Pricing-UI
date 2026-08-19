import { startAppTabPresence, watchAppTabPresence } from "@/services/appPresence";
import type { SharedSseOutbound, WorkerRole } from "@/workers/sharedSseProtocol";

const WORKER_URL = new URL("../workers/shared-worker.ts", import.meta.url);
const WORKER_NAME = "trading-sse";
const HEARTBEAT_MS = 2_000;

let appPresenceCount = 0;
let appPresenceDispose: (() => void) | null = null;

/**
 * Tell the SharedWorker this document is an app tab or a chart popout.
 * Chart ports receive `shutdown` when the last app tab disconnects.
 *
 * App-tab presence is ref-counted so React StrictMode remounts do not
 * briefly drop to zero app ports and close chart windows.
 */
export function registerWorkerRole(
  role: WorkerRole,
  onShutdown?: () => void,
): () => void {
  if (role === "app") {
    return retainAppPresence();
  }
  return connectChart(onShutdown);
}

function retainAppPresence(): () => void {
  appPresenceCount += 1;
  if (appPresenceCount === 1) {
    const stopBroadcast = startAppTabPresence();
    const stopWorker = connectRole("app");
    appPresenceDispose = () => {
      stopBroadcast();
      stopWorker();
    };
  }

  return () => {
    appPresenceCount -= 1;
    if (appPresenceCount > 0) return;
    const dispose = appPresenceDispose;
    queueMicrotask(() => {
      if (appPresenceCount > 0) return;
      dispose?.();
      if (appPresenceDispose === dispose) {
        appPresenceDispose = null;
      }
    });
  };
}

function connectChart(onShutdown?: () => void): () => void {
  const stopWorker = connectRole("chart", onShutdown);
  const stopBroadcast = watchAppTabPresence(() => onShutdown?.());
  return () => {
    stopBroadcast();
    stopWorker();
  };
}

function connectRole(
  role: WorkerRole,
  onShutdown?: () => void,
): () => void {
  if (typeof SharedWorker === "undefined") {
    return fallbackRoleWatch(role, onShutdown);
  }

  try {
    const worker = new SharedWorker(WORKER_URL, {
      type: "module",
      name: WORKER_NAME,
    });
    const port = worker.port;
    let closed = false;

    port.onmessage = (event: MessageEvent<SharedSseOutbound>) => {
      if (event.data?.type === "shutdown") {
        onShutdown?.();
      }
    };

    port.start();
    port.postMessage({ type: "register", role });

    const heartbeat =
      role === "app"
        ? window.setInterval(() => {
            if (closed) return;
            port.postMessage({ type: "heartbeat" });
          }, HEARTBEAT_MS)
        : null;

    const onPageHide = () => {
      if (closed) return;
      port.postMessage({ type: "unregister" });
    };
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);

    return () => {
      if (closed) return;
      closed = true;
      if (heartbeat != null) window.clearInterval(heartbeat);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      try {
        port.postMessage({ type: "unregister" });
      } catch {
        // Port may already be closing with the document.
      }
      port.close();
    };
  } catch {
    return fallbackRoleWatch(role, onShutdown);
  }
}

/** Without SharedWorker, chart popouts close when their opener is gone. */
function fallbackRoleWatch(
  role: WorkerRole,
  onShutdown?: () => void,
): () => void {
  if (role !== "chart" || !onShutdown) {
    return () => {};
  }

  const id = window.setInterval(() => {
    if (!window.opener || window.opener.closed) {
      onShutdown();
    }
  }, 1000);

  return () => window.clearInterval(id);
}
