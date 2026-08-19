import { describe, expect, it } from "vitest";
import { createSseHub, type EventSourceLike, type HubPort } from "./sharedSseHub";
import type { SharedSseOutbound } from "./sharedSseProtocol";

/**
 * These tests stand in for extra Chrome tabs: each `fakePort()` is one tab's
 * MessagePort. The hub must reuse a single EventSource per URL instead of
 * opening a new SSE connection for every subscriber.
 *
 * FakeEventSource.instances.length === how many real connections the worker
 * would have opened.
 */
class FakeEventSource implements EventSourceLike {
  static instances: FakeEventSource[] = [];

  /** 0 = CONNECTING, 1 = OPEN, 2 = CLOSED (EventSource readyState). */
  readyState = 0;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  /** Named SSE events, e.g. `event: valuation_update`. */
  private named = new Map<string, Set<(event: Event) => void>>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    let set = this.named.get(type);
    if (!set) {
      set = new Set();
      this.named.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.named.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  /** Simulate the browser firing EventSource.onopen. */
  open() {
    this.readyState = 1;
    this.onopen?.(new Event("open"));
  }

  /** Default `data:` frames (market-data /stream). */
  emitDefault(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }

  /** Named frames (`event: valuation_update` on /valuation-stream). */
  emitNamed(eventName: string, data: unknown) {
    const payload = { data: JSON.stringify(data) } as MessageEvent<string>;
    for (const listener of this.named.get(eventName) ?? []) {
      listener(payload);
    }
  }
}

/** One tab talking to the SharedWorker. `messages` is what that tab received. */
function fakePort(): HubPort & { messages: SharedSseOutbound[] } {
  const messages: SharedSseOutbound[] = [];
  return {
    messages,
    postMessage(msg) {
      messages.push(msg);
    },
  };
}

function createTestHub(options?: { now?: () => number; staleMs?: number }) {
  // Isolate instance counts between tests — the static list is the assertion.
  FakeEventSource.instances = [];
  return createSseHub((url) => new FakeEventSource(url), options);
}

const MARKET = "/api/market-data/stream";
const VALUATION = "/api/pricing/valuation-stream";

describe("createSseHub connection sharing", () => {
  it("does not open a second EventSource when another tab subscribes to the same URL", () => {
    const hub = createTestHub();
    // Tab A, then tab B — both on market-data /stream.
    hub.subscribe(fakePort(), MARKET);
    hub.subscribe(fakePort(), MARKET);

    // The whole point of the SharedWorker: N tabs, 1 TCP/SSE connection.
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]?.url).toBe(MARKET);
  });

  it("shares one EventSource for blotter and pricing on /valuation-stream", () => {
    const hub = createTestHub();
    // Different views, same backend stream + named event.
    hub.subscribe(fakePort(), VALUATION, "valuation_update");
    hub.subscribe(fakePort(), VALUATION, "valuation_update");

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(FakeEventSource.instances[0]?.url).toBe(VALUATION);
  });

  it("opens a separate EventSource per distinct URL", () => {
    const hub = createTestHub();
    // Sharing is per URL, not a single global socket.
    hub.subscribe(fakePort(), MARKET);
    hub.subscribe(fakePort(), VALUATION, "valuation_update");

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(FakeEventSource.instances.map((source) => source.url)).toEqual([
      MARKET,
      VALUATION,
    ]);
  });

  it("keeps the connection open until the last tab unsubscribes", () => {
    const hub = createTestHub();
    const tabA = fakePort();
    const tabB = fakePort();
    hub.subscribe(tabA, MARKET);
    hub.subscribe(tabB, MARKET);
    const source = FakeEventSource.instances[0];

    // Closing one tab must not drop the stream for the other.
    hub.unsubscribe(tabB, MARKET);
    expect(source?.closed).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);

    hub.unsubscribe(tabA, MARKET);
    expect(source?.closed).toBe(true);
  });

  it("fans default ticks out to every tab on the shared connection", () => {
    const hub = createTestHub();
    const tabA = fakePort();
    const tabB = fakePort();
    hub.subscribe(tabA, MARKET);
    hub.subscribe(tabB, MARKET);
    FakeEventSource.instances[0]?.open();
    // One server frame → both tabs see the same parsed payload.
    FakeEventSource.instances[0]?.emitDefault({ symbol: "ACME", last: 10 });

    const tickA = tabA.messages.find((msg) => msg.type === "message");
    const tickB = tabB.messages.find((msg) => msg.type === "message");
    expect(tickA).toEqual({
      type: "message",
      url: MARKET,
      data: { symbol: "ACME", last: 10 },
      receivedCount: 1,
    });
    expect(tickB).toEqual(tickA);
  });

  it("fans named valuation events to every tab on the shared connection", () => {
    const hub = createTestHub();
    const pricing = fakePort();
    const blotter = fakePort();
    hub.subscribe(pricing, VALUATION, "valuation_update");
    hub.subscribe(blotter, VALUATION, "valuation_update");
    FakeEventSource.instances[0]?.emitNamed("valuation_update", {
      trade_id: "t1",
    });

    expect(
      pricing.messages.find((msg) => msg.type === "message"),
    ).toMatchObject({
      type: "message",
      url: VALUATION,
      eventName: "valuation_update",
      data: { trade_id: "t1" },
      receivedCount: 1,
    });
    expect(blotter.messages.find((msg) => msg.type === "message")).toEqual(
      pricing.messages.find((msg) => msg.type === "message"),
    );
  });

  it("shares the EventSource frame count with a tab that joins later", () => {
    const hub = createTestHub();
    const tabA = fakePort();
    hub.subscribe(tabA, MARKET);
    FakeEventSource.instances[0]?.open();
    FakeEventSource.instances[0]?.emitDefault({ symbol: "ACME", last: 10 });
    FakeEventSource.instances[0]?.emitDefault({ symbol: "ACME", last: 11 });

    const tabB = fakePort();
    hub.subscribe(tabB, MARKET);
    const seed = tabB.messages.find((msg) => msg.type === "status");
    expect(seed).toMatchObject({
      type: "status",
      url: MARKET,
      receivedCount: 2,
    });
  });
});

describe("createSseHub app vs chart roles", () => {
  it("does not shut down charts while another app tab is still connected", () => {
    const hub = createTestHub();
    const appA = fakePort();
    const appB = fakePort();
    const chart = fakePort();
    hub.register(appA, "app");
    hub.register(appB, "app");
    hub.register(chart, "chart");

    hub.detachPort(appA);

    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(false);
  });

  it("shuts down chart ports when the last app tab disconnects", () => {
    const hub = createTestHub();
    const appA = fakePort();
    const appB = fakePort();
    const chart = fakePort();
    hub.register(appA, "app");
    hub.register(appB, "app");
    hub.register(chart, "chart");

    hub.detachPort(appA);
    hub.detachPort(appB);

    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(true);
  });

  it("shuts down charts when the last app port unregisters", () => {
    const hub = createTestHub();
    const app = fakePort();
    const chart = fakePort();
    hub.register(app, "app");
    hub.register(chart, "chart");

    hub.detachPort(app);

    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(true);
  });

  it("treats a silent app port as gone after the stale window", () => {
    let t = 0;
    const hub = createTestHub({ now: () => t, staleMs: 1_000 });
    const app = fakePort();
    const chart = fakePort();
    hub.register(app, "app");
    hub.register(chart, "chart");

    t = 500;
    hub.sweepStaleAppPorts();
    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(false);

    t = 1_500;
    hub.sweepStaleAppPorts();
    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(true);
  });

  it("keeps charts open when a stale app tab still heartbeats", () => {
    let t = 0;
    const hub = createTestHub({ now: () => t, staleMs: 1_000 });
    const app = fakePort();
    const chart = fakePort();
    hub.register(app, "app");
    hub.register(chart, "chart");

    t = 900;
    hub.heartbeat(app);
    t = 1_500;
    hub.sweepStaleAppPorts();

    expect(chart.messages.some((msg) => msg.type === "shutdown")).toBe(false);
  });
});
