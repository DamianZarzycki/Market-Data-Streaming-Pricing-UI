import type { LiveStatus } from "@/domain/types";
import { liveStatusFor } from "@/services/pricingMappers";
import type { PricingValuationRow } from "@/services/pricingTypes";

export type ValuationSortKey =
  | "tradeId"
  | "symbol"
  | "book"
  | "assetClass"
  | "fairValue"
  | "unrealizedPnl"
  | "status"
  | "updated";

export type ValuationSortDir = "asc" | "desc";

export interface ValuationSortState {
  key: ValuationSortKey;
  dir: ValuationSortDir;
}

const STATUS_RANK: Record<LiveStatus, number> = {
  LIVE: 0,
  STALE: 1,
  ERROR: 2,
};

function compareNullableNumber(
  a: number | null,
  b: number | null,
  dir: ValuationSortDir,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function compareString(a: string, b: string, dir: ValuationSortDir): number {
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? result : -result;
}

export function compareValuationRows(
  a: PricingValuationRow,
  b: PricingValuationRow,
  sort: ValuationSortState,
  nowMs: number,
): number {
  const { key, dir } = sort;

  switch (key) {
    case "tradeId":
      return compareString(a.tradeId, b.tradeId, dir);
    case "symbol":
      return compareString(a.symbol, b.symbol, dir);
    case "book":
      return compareString(a.bookName, b.bookName, dir);
    case "assetClass":
      return compareString(String(a.assetClass), String(b.assetClass), dir);
    case "fairValue":
      return compareNullableNumber(a.fairValue, b.fairValue, dir);
    case "unrealizedPnl":
      return compareNullableNumber(a.unrealizedPnl, b.unrealizedPnl, dir);
    case "status": {
      const rankA = STATUS_RANK[liveStatusFor(a.receivedAt, nowMs)];
      const rankB = STATUS_RANK[liveStatusFor(b.receivedAt, nowMs)];
      return dir === "asc" ? rankA - rankB : rankB - rankA;
    }
    case "updated":
      return dir === "asc"
        ? a.receivedAt - b.receivedAt
        : b.receivedAt - a.receivedAt;
    default:
      return 0;
  }
}

export function sortValuationRows(
  rows: PricingValuationRow[],
  sort: ValuationSortState | null,
  nowMs: number,
): PricingValuationRow[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => compareValuationRows(a, b, sort, nowMs));
}

/** Cycle: unset → asc → desc → unset. Switching column starts at asc. */
export function nextValuationSort(
  current: ValuationSortState | null,
  key: ValuationSortKey,
): ValuationSortState | null {
  if (!current || current.key !== key) {
    return { key, dir: "asc" };
  }
  if (current.dir === "asc") {
    return { key, dir: "desc" };
  }
  return null;
}
