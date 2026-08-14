import type { SharedSseOutbound, SseStatus } from "./sharedSseProtocol";

const SSE_CONNECTING = 0;
const SSE_OPEN = 1;
const SSE_CLOSED = 2;

export type HubPort = {
  postMessage: (msg: SharedSseOutbound) => void;
};

export type EventSourceLike = {
  readyState: number;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  close(): void;
};

export type CreateEventSource = (url: string) => EventSourceLike;

type NamedListener = (event: Event) => void;

type StreamState = {
  source: EventSourceLike;
  ports: Map<HubPort, string | undefined>;
  namedListeners: Map<string, NamedListener>;
  receivedCount: number;
};

function parseJsonData(event: MessageEvent<string>): unknown | null {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

function statusFromReadyState(readyState: number): SseStatus {
  if (readyState === SSE_OPEN) return "CONNECTED";
  if (readyState === SSE_CONNECTING) return "CONNECTING";
  return "ERROR";
}

/**
 * Shared EventSource registry used by the SharedWorker. One connection per URL;
 * additional ports (tabs) reuse it.
 */
export function createSseHub(
  createEventSource: CreateEventSource = (url) => new EventSource(url),
) {
  const streams = new Map<string, StreamState>();

  function post(port: HubPort, msg: SharedSseOutbound) {
    port.postMessage(msg);
  }

  function broadcastStatus(state: StreamState, url: string, status: SseStatus) {
    for (const [port, eventName] of state.ports) {
      post(port, {
        type: "status",
        url,
        eventName,
        status,
        receivedCount: state.receivedCount,
      });
    }
  }

  function broadcastDefault(state: StreamState, url: string, data: unknown) {
    for (const [port, eventName] of state.ports) {
      if (eventName) continue;
      post(port, {
        type: "message",
        url,
        data,
        receivedCount: state.receivedCount,
      });
    }
  }

  function broadcastNamed(
    state: StreamState,
    url: string,
    eventName: string,
    data: unknown,
  ) {
    for (const [port, name] of state.ports) {
      if (name !== eventName) continue;
      post(port, {
        type: "message",
        url,
        eventName,
        data,
        receivedCount: state.receivedCount,
      });
    }
  }

  function noteReceived(state: StreamState) {
    state.receivedCount += 1;
  }

  function ensureNamedListener(
    state: StreamState,
    url: string,
    eventName: string,
  ) {
    if (state.namedListeners.has(eventName)) return;

    const listener: NamedListener = (event) => {
      const data = parseJsonData(event as MessageEvent<string>);
      if (data === null) return;
      noteReceived(state);
      broadcastNamed(state, url, eventName, data);
    };

    state.source.addEventListener(eventName, listener);
    state.namedListeners.set(eventName, listener);
  }

  function dropUnusedNamedListeners(state: StreamState) {
    const used = new Set<string>();
    for (const name of state.ports.values()) {
      if (name) used.add(name);
    }
    for (const [name, listener] of state.namedListeners) {
      if (used.has(name)) continue;
      state.source.removeEventListener(name, listener);
      state.namedListeners.delete(name);
    }
  }

  function openStream(url: string): StreamState {
    const source = createEventSource(url);
    const state: StreamState = {
      source,
      ports: new Map(),
      namedListeners: new Map(),
      receivedCount: 0,
    };

    source.onopen = () => {
      broadcastStatus(state, url, "CONNECTED");
    };

    source.onmessage = (event: MessageEvent<string>) => {
      const data = parseJsonData(event);
      if (data === null) return;
      noteReceived(state);
      broadcastDefault(state, url, data);
    };

    source.onerror = () => {
      const status =
        source.readyState === SSE_CLOSED ? "ERROR" : "RECONNECTING";
      broadcastStatus(state, url, status);
    };

    streams.set(url, state);
    return state;
  }

  function subscribe(port: HubPort, url: string, eventName?: string) {
    let state = streams.get(url);
    if (!state) {
      state = openStream(url);
    }
    state.ports.set(port, eventName);
    if (eventName) {
      ensureNamedListener(state, url, eventName);
    }
    post(port, {
      type: "status",
      url,
      eventName,
      status: statusFromReadyState(state.source.readyState),
      receivedCount: state.receivedCount,
    });
  }

  function unsubscribe(port: HubPort, url: string) {
    const state = streams.get(url);
    if (!state) return;
    state.ports.delete(port);
    dropUnusedNamedListeners(state);
    if (state.ports.size === 0) {
      state.source.close();
      streams.delete(url);
    }
  }

  function detachPort(port: HubPort) {
    for (const url of [...streams.keys()]) {
      unsubscribe(port, url);
    }
  }

  return { subscribe, unsubscribe, detachPort };
}
