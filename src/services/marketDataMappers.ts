import type { LiveStatus } from "@/domain/types";
import type {
  MarketDataClass,
  MarketDataSnapshotDto,
  MarketDataTickDto,
  MarketTickRow,
  PricePoint,
} from "@/services/marketDataTypes";

export const STALE_MS = 20_000;
export const MAX_TICK_ROWS = 150;
export const MAX_PRICE_POINTS = 100;
export const PRICE_HISTORY_WINDOW_MS = 5 * 60 * 1000;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function resolveDataClass(dto: MarketDataTickDto): MarketDataClass {
  if (typeof dto.curve_type === "string" && dto.curve_type) {
    return dto.curve_type;
  }
  if (typeof dto.asset_type === "string" && dto.asset_type) {
    return dto.asset_type;
  }
  return "UNKNOWN";
}

export function resolveInstrumentKey(
  dto: MarketDataTickDto,
  snapshotKey?: string,
): string {
  if (typeof dto.symbol === "string" && dto.symbol) return dto.symbol;
  if (typeof dto.curve_name === "string" && dto.curve_name) return dto.curve_name;
  // Prefer the snapshot / stream key (e.g. "IRS") — do not invent IRS:USD from currency.
  if (snapshotKey) return snapshotKey;
  if (resolveDataClass(dto) === "IRS") return "IRS";
  return "UNKNOWN";
}

export function resolvePrice(dto: MarketDataTickDto): number | null {
  const last = asNumber(dto.last);
  if (last !== null) return last;

  const spot = asNumber(dto.spot);
  if (spot !== null) return spot;

  const bondYield = asNumber(dto.yield);
  if (bondYield !== null) return bondYield;

  const fixedRate = asNumber(dto.fixed_rate);
  if (fixedRate !== null) return fixedRate;

  if (Array.isArray(dto.rates) && dto.rates.length > 0) {
    return asNumber(dto.rates[0]);
  }

  const mid =
    asNumber(dto.bid) !== null && asNumber(dto.ask) !== null
      ? ((asNumber(dto.bid) as number) + (asNumber(dto.ask) as number)) / 2
      : null;
  return mid;
}

export function resolveCurrency(
  dto: MarketDataTickDto,
  dataClass: MarketDataClass,
  instrumentKey: string,
): string | null {
  if (typeof dto.currency === "string" && dto.currency.trim()) {
    return dto.currency.trim().toUpperCase();
  }

  // FX pairs like EURUSD → quote currency USD
  if (dataClass === "FX" && /^[A-Z]{6}$/.test(instrumentKey)) {
    return instrumentKey.slice(3);
  }

  // Demo universe defaults when backend omits currency
  if (
    dataClass === "OPTION" ||
    dataClass === "EQUITY" ||
    dataClass === "BENCHMARK" ||
    dataClass === "BOND"
  ) {
    return "USD";
  }

  return null;
}

export function mapTickDto(
  dto: MarketDataTickDto,
  options?: { receivedAt?: number; snapshotKey?: string },
): MarketTickRow {
  const receivedAt = options?.receivedAt ?? Date.now();
  const instrumentKey = resolveInstrumentKey(dto, options?.snapshotKey);
  const dataClass = resolveDataClass(dto);
  const timestamp =
    typeof dto.timestamp === "string" && dto.timestamp
      ? dto.timestamp
      : new Date(receivedAt).toISOString();

  return {
    // Stable id = instrument so the table upserts in place instead of stacking rows.
    id: instrumentKey,
    instrumentKey,
    symbol: instrumentKey,
    dataClass,
    price: resolvePrice(dto),
    currency: resolveCurrency(dto, dataClass, instrumentKey),
    timestamp,
    receivedAt,
    eventId: typeof dto.event_id === "number" ? dto.event_id : undefined,
    raw: dto,
  };
}

export function mapSnapshotDto(
  snapshot: MarketDataSnapshotDto,
  receivedAt = Date.now(),
): MarketTickRow[] {
  return Object.entries(snapshot).map(([key, dto]) =>
    mapTickDto(dto, { receivedAt, snapshotKey: key }),
  );
}

export function liveStatusFor(
  receivedAt: number,
  nowMs: number,
  staleMs = STALE_MS,
): LiveStatus {
  return nowMs - receivedAt < staleMs ? "LIVE" : "STALE";
}

export function appendPriceHistory(
  history: Map<string, PricePoint[]>,
  row: MarketTickRow,
  nowMs = row.receivedAt,
): Map<string, PricePoint[]> {
  if (row.price === null) return history;

  const next = new Map(history);
  const cutoff = nowMs - PRICE_HISTORY_WINDOW_MS;
  const prev = next.get(row.instrumentKey) ?? [];
  const point: PricePoint = { t: row.receivedAt, price: row.price };
  const trimmed = [...prev, point]
    .filter((p) => p.t >= cutoff)
    .slice(-MAX_PRICE_POINTS);
  next.set(row.instrumentKey, trimmed);
  return next;
}

/**
 * Upsert by instrumentKey (latest wins). Keep existing row order stable so live
 * ticks update cells in place instead of reshuffling the table. Brand-new
 * instruments are appended at the end.
 */
export function mergeTickRows(
  current: MarketTickRow[],
  incoming: MarketTickRow[],
  maxRows = MAX_TICK_ROWS,
): MarketTickRow[] {
  if (incoming.length === 0) return current;

  const incomingByKey = new Map<string, MarketTickRow>();
  for (const row of incoming) {
    incomingByKey.set(row.instrumentKey, {
      ...row,
      // Stable React row identity across updates for the same instrument.
      id: row.instrumentKey,
    });
  }

  const seen = new Set<string>();
  const merged: MarketTickRow[] = [];

  for (const row of current) {
    seen.add(row.instrumentKey);
    merged.push(incomingByKey.get(row.instrumentKey) ?? row);
  }

  for (const [key, row] of incomingByKey) {
    if (!seen.has(key)) {
      merged.push(row);
    }
  }

  return merged.slice(0, maxRows);
}
