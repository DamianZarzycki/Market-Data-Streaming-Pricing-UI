import type { AssetClass, LiveStatus } from "@/domain/types";
import type {
  FrequencyInsight,
  PnlImpactInsight,
  PricingBookMetricsDto,
  PricingValuationDto,
  PricingValuationRow,
  PricingValuationsSnapshotDto,
  StaleInsight,
  StreamInsights,
} from "@/services/pricingTypes";

export const STALE_MS = 20_000;
export const FREQUENCY_WINDOW_MS = 60_000;
export const INSIGHT_LIMIT = 3;

export type BookNameLookup = Record<string, string>;

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function liveStatusFor(receivedAt: number, nowMs: number): LiveStatus {
  return nowMs - receivedAt > STALE_MS ? "STALE" : "LIVE";
}

export function mapValuationDto(
  dto: PricingValuationDto,
  options?: {
    bookNames?: BookNameLookup;
    metrics?: PricingBookMetricsDto | null;
    receivedAt?: number;
    tradeIdFallback?: string;
  },
): PricingValuationRow | null {
  const tradeId =
    asString(dto.trade_id) || asString(options?.tradeIdFallback);
  if (!tradeId) return null;

  const bookId = asString(dto.book_id);
  const valuationTime =
    asString(dto.valuation_time) || new Date().toISOString();
  const receivedAt =
    options?.receivedAt ??
    (Number.isFinite(Date.parse(valuationTime))
      ? Date.parse(valuationTime)
      : Date.now());

  const metrics = options?.metrics;
  const bookNames = options?.bookNames ?? {};

  return {
    tradeId,
    bookId,
    bookName: bookNames[bookId] ?? (bookId || "—"),
    assetClass: (asString(dto.asset_class, "UNKNOWN") as AssetClass) || "UNKNOWN",
    symbol: asString(dto.symbol, "—"),
    side: dto.side,
    fairValue: asNumber(dto.fair_value),
    marketValue: asNumber(dto.market_value),
    unrealizedPnl: asNumber(dto.unrealized_pnl),
    realizedPnl: asNumber(dto.realized_pnl),
    totalPnl: asNumber(dto.total_pnl),
    currency: asString(dto.currency) || null,
    valuationTime,
    receivedAt,
    alpha: asNumber(metrics?.alpha),
    beta: asNumber(metrics?.beta),
    pricingDetails: dto.pricing_details,
  };
}

export function mapSnapshotDto(
  snapshot: PricingValuationsSnapshotDto,
  bookNames: BookNameLookup = {},
  metricsByBook: Record<string, PricingBookMetricsDto> = {},
): PricingValuationRow[] {
  const rows: PricingValuationRow[] = [];
  for (const [tradeId, dto] of Object.entries(snapshot ?? {})) {
    const mapped = mapValuationDto(dto ?? {}, {
      bookNames,
      metrics: metricsByBook[asString(dto?.book_id)] ?? null,
      tradeIdFallback: tradeId,
    });
    if (mapped) rows.push(mapped);
  }
  return rows.sort((a, b) => b.receivedAt - a.receivedAt);
}

function mergeRow(
  prev: PricingValuationRow | undefined,
  next: PricingValuationRow,
): PricingValuationRow {
  return {
    ...prev,
    ...next,
    // Keep book name / alpha-beta from previous if incoming lacks them.
    bookName:
      next.bookName && next.bookName !== "—"
        ? next.bookName
        : (prev?.bookName ?? next.bookName),
    alpha: next.alpha ?? prev?.alpha ?? null,
    beta: next.beta ?? prev?.beta ?? null,
  };
}

/**
 * Upsert by trade_id, updating each existing row in place so a trade keeps a
 * stable position in the table instead of jumping on every tick. Genuinely new
 * trades are appended in first-seen order.
 */
export function mergeValuationRows(
  current: PricingValuationRow[],
  incoming: PricingValuationRow[],
): PricingValuationRow[] {
  if (incoming.length === 0) return current;

  // Last write wins within the flush window.
  const incomingById = new Map<string, PricingValuationRow>();
  for (const row of incoming) {
    incomingById.set(row.tradeId, row);
  }

  const currentIds = new Set(current.map((row) => row.tradeId));

  // Update existing rows in place, preserving their order.
  const merged = current.map((row) => {
    const next = incomingById.get(row.tradeId);
    return next ? mergeRow(row, next) : row;
  });

  // Append trades we haven't seen before, keeping first-seen order.
  const appended: PricingValuationRow[] = [];
  const appendedIds = new Set<string>();
  for (const row of incoming) {
    if (currentIds.has(row.tradeId) || appendedIds.has(row.tradeId)) continue;
    appendedIds.add(row.tradeId);
    appended.push(incomingById.get(row.tradeId)!);
  }

  return appended.length > 0 ? [...merged, ...appended] : merged;
}

export function applyBookMetrics(
  rows: PricingValuationRow[],
  metricsByBook: Record<string, PricingBookMetricsDto>,
  bookNames: BookNameLookup = {},
): PricingValuationRow[] {
  return rows.map((row) => {
    const metrics = metricsByBook[row.bookId];
    return {
      ...row,
      bookName: bookNames[row.bookId] ?? row.bookName,
      alpha: asNumber(metrics?.alpha) ?? row.alpha,
      beta: asNumber(metrics?.beta) ?? row.beta,
    };
  });
}

/** Append timestamps for frequency insights; prune older than the window. */
export function recordUpdateTimestamps(
  current: Map<string, number[]>,
  symbols: string[],
  nowMs: number,
  windowMs = FREQUENCY_WINDOW_MS,
): Map<string, number[]> {
  if (symbols.length === 0) return current;
  const cutoff = nowMs - windowMs;
  const next = new Map(current);

  for (const symbol of symbols) {
    if (!symbol) continue;
    const prev = next.get(symbol) ?? [];
    next.set(
      symbol,
      [...prev, nowMs].filter((t) => t >= cutoff),
    );
  }

  // Prune untouched keys as well
  for (const [key, times] of next) {
    const trimmed = times.filter((t) => t >= cutoff);
    if (trimmed.length === 0) next.delete(key);
    else if (trimmed.length !== times.length) next.set(key, trimmed);
  }

  return next;
}

export function deriveStreamInsights(
  rows: PricingValuationRow[],
  updateTimestamps: Map<string, number[]>,
  nowMs: number,
  limit = INSIGHT_LIMIT,
): StreamInsights {
  const assetClassBySymbol = new Map<string, string>();
  for (const row of rows) {
    if (!assetClassBySymbol.has(row.symbol)) {
      assetClassBySymbol.set(row.symbol, String(row.assetClass));
    }
  }

  const frequent: FrequencyInsight[] = [...updateTimestamps.entries()]
    .map(([symbol, times]) => ({
      key: symbol,
      symbol,
      assetClass: assetClassBySymbol.get(symbol) ?? "—",
      ticksPerMin: times.length,
    }))
    .sort((a, b) => b.ticksPerMin - a.ticksPerMin)
    .slice(0, limit);

  const stale: StaleInsight[] = rows
    .filter((row) => liveStatusFor(row.receivedAt, nowMs) === "STALE")
    .map((row) => ({
      tradeId: row.tradeId,
      symbol: row.symbol,
      bookName: row.bookName,
      ageMs: Math.max(0, nowMs - row.receivedAt),
      lastUpdated: row.valuationTime,
    }))
    .sort((a, b) => b.ageMs - a.ageMs)
    .slice(0, limit);

  const pnlImpact: PnlImpactInsight[] = rows
    .filter((row) => row.unrealizedPnl != null)
    .map((row) => ({
      tradeId: row.tradeId,
      symbol: row.symbol,
      bookName: row.bookName,
      unrealizedPnl: row.unrealizedPnl as number,
    }))
    .sort(
      (a, b) => Math.abs(b.unrealizedPnl) - Math.abs(a.unrealizedPnl),
    )
    .slice(0, limit);

  return { frequent, stale, pnlImpact };
}
