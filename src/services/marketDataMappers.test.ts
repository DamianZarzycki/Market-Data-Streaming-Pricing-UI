import { describe, expect, it } from "vitest";
import {
  appendPriceHistoryBatch,
  MAX_PRICE_POINTS,
  PRICE_HISTORY_WINDOW_MS,
  tickTimeMs,
} from "@/services/marketDataMappers";
import type { MarketTickRow, PricePoint } from "@/services/marketDataTypes";

const T0 = "2026-01-01T00:00:00.000Z";
const T0_MS = Date.parse(T0);

function row(
  overrides: Partial<MarketTickRow> &
    Pick<MarketTickRow, "instrumentKey" | "timestamp" | "price">,
): MarketTickRow {
  return {
    id: overrides.instrumentKey,
    symbol: overrides.instrumentKey,
    dataClass: "EQUITY",
    currency: "USD",
    description: null,
    receivedAt: 9_999_999_999_999,
    raw: {},
    ...overrides,
  };
}

describe("tickTimeMs", () => {
  it("parses the tick timestamp", () => {
    expect(tickTimeMs(row({ instrumentKey: "ACME", timestamp: T0, price: 1 }))).toBe(
      T0_MS,
    );
  });

  it("returns null for missing or invalid timestamps", () => {
    expect(
      tickTimeMs(row({ instrumentKey: "ACME", timestamp: "", price: 1 })),
    ).toBeNull();
    expect(
      tickTimeMs(row({ instrumentKey: "ACME", timestamp: "not-a-date", price: 1 })),
    ).toBeNull();
  });
});

describe("appendPriceHistoryBatch", () => {
  it("keeps last price in the same second", () => {
    const history = appendPriceHistoryBatch(
      new Map(),
      [
        row({
          instrumentKey: "ACME",
          timestamp: "2026-01-01T00:00:00.100Z",
          price: 10,
        }),
        row({
          instrumentKey: "ACME",
          timestamp: "2026-01-01T00:00:00.900Z",
          price: 11,
        }),
      ],
    );

    expect(history.get("ACME")).toEqual([{ t: T0_MS, price: 11 }]);
  });

  it("appends a point in a new second", () => {
    const history = appendPriceHistoryBatch(
      new Map(),
      [
        row({ instrumentKey: "ACME", timestamp: T0, price: 10 }),
        row({
          instrumentKey: "ACME",
          timestamp: "2026-01-01T00:00:01.000Z",
          price: 12,
        }),
      ],
    );

    expect(history.get("ACME")).toEqual([
      { t: T0_MS, price: 10 },
      { t: T0_MS + 1000, price: 12 },
    ]);
  });

  it("ignores an older tick", () => {
    const history = appendPriceHistoryBatch(
      new Map(),
      [
        row({
          instrumentKey: "ACME",
          timestamp: "2026-01-01T00:00:01.000Z",
          price: 12,
        }),
        row({ instrumentKey: "ACME", timestamp: T0, price: 10 }),
      ],
    );

    expect(history.get("ACME")).toEqual([{ t: T0_MS + 1000, price: 12 }]);
  });

  it("skips rows without a usable timestamp or price", () => {
    const history = appendPriceHistoryBatch(new Map(), [
      row({ instrumentKey: "ACME", timestamp: "", price: 10 }),
      row({ instrumentKey: "ACME", timestamp: "nope", price: 10 }),
      row({ instrumentKey: "ACME", timestamp: T0, price: null }),
    ]);

    expect(history.size).toBe(0);
  });

  it("trims the window using tick time, not the browser clock", () => {
    const later = new Date(T0_MS + PRICE_HISTORY_WINDOW_MS + 1000).toISOString();
    const history = appendPriceHistoryBatch(
      new Map(),
      [
        row({ instrumentKey: "ACME", timestamp: T0, price: 10 }),
        row({ instrumentKey: "ACME", timestamp: later, price: 20 }),
      ],
    );

    expect(history.get("ACME")).toEqual([
      { t: T0_MS + PRICE_HISTORY_WINDOW_MS + 1000, price: 20 },
    ]);
  });

  it("copies the Map once and leaves other series references unchanged", () => {
    const other: PricePoint[] = [{ t: T0_MS, price: 1.1 }];
    const current = new Map<string, PricePoint[]>([["EURUSD", other]]);

    const next = appendPriceHistoryBatch(current, [
      row({ instrumentKey: "ACME", timestamp: T0, price: 10 }),
    ]);

    expect(next).not.toBe(current);
    expect(next.get("EURUSD")).toBe(other);
    expect(next.get("ACME")).toEqual([{ t: T0_MS, price: 10 }]);
  });

  it("returns the same Map when nothing is applied", () => {
    const current = new Map<string, PricePoint[]>();
    const next = appendPriceHistoryBatch(current, [
      row({ instrumentKey: "ACME", timestamp: "", price: 10 }),
    ]);
    expect(next).toBe(current);
  });

  it("caps series length at MAX_PRICE_POINTS", () => {
    const rows = Array.from({ length: MAX_PRICE_POINTS + 5 }, (_, i) =>
      row({
        instrumentKey: "ACME",
        timestamp: new Date(T0_MS + i * 1000).toISOString(),
        price: i,
      }),
    );

    const history = appendPriceHistoryBatch(new Map(), rows);
    const series = history.get("ACME") ?? [];
    expect(series).toHaveLength(MAX_PRICE_POINTS);
    expect(series[0]?.t).toBe(T0_MS + 5 * 1000);
    expect(series[series.length - 1]?.price).toBe(MAX_PRICE_POINTS + 4);
  });
});
