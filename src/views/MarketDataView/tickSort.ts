import type { LiveStatus } from "@/domain/types";
import { liveStatusFor, STALE_MS } from "@/services/marketDataMappers";
import type { MarketTickRow } from "@/services/marketDataTypes";

export type TickSortKey =
  | "time"
  | "symbol"
  | "dataClass"
  | "description"
  | "price"
  | "status";

export type TickSortDir = "asc" | "desc";

export interface TickSortState {
  key: TickSortKey;
  dir: TickSortDir;
}

const STATUS_RANK: Record<LiveStatus, number> = {
  LIVE: 0,
  STALE: 1,
  ERROR: 2,
};

function compareNullableNumber(
  a: number | null,
  b: number | null,
  dir: TickSortDir,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function compareString(a: string, b: string, dir: TickSortDir): number {
  const result = a.localeCompare(b, undefined, { sensitivity: "base" });
  return dir === "asc" ? result : -result;
}

export function compareTickRows(
  a: MarketTickRow,
  b: MarketTickRow,
  sort: TickSortState,
  nowMs: number,
  staleMs = STALE_MS,
): number {
  const { key, dir } = sort;

  switch (key) {
    case "time":
      return dir === "asc"
        ? a.receivedAt - b.receivedAt
        : b.receivedAt - a.receivedAt;
    case "symbol":
      return compareString(a.symbol, b.symbol, dir);
    case "dataClass":
      return compareString(a.dataClass, b.dataClass, dir);
    case "description":
      return compareString(a.description ?? "", b.description ?? "", dir);
    case "price":
      return compareNullableNumber(a.price, b.price, dir);
    case "status": {
      const rankA = STATUS_RANK[liveStatusFor(a.receivedAt, nowMs, staleMs)];
      const rankB = STATUS_RANK[liveStatusFor(b.receivedAt, nowMs, staleMs)];
      return dir === "asc" ? rankA - rankB : rankB - rankA;
    }
    default:
      return 0;
  }
}

export function sortTickRows(
  rows: MarketTickRow[],
  sort: TickSortState | null,
  nowMs: number,
  staleMs = STALE_MS,
): MarketTickRow[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => compareTickRows(a, b, sort, nowMs, staleMs));
}

/** Cycle: unset → asc → desc → unset. Switching column starts at asc. */
export function nextTickSort(
  current: TickSortState | null,
  key: TickSortKey,
): TickSortState | null {
  if (!current || current.key !== key) {
    return { key, dir: "asc" };
  }
  if (current.dir === "asc") {
    return { key, dir: "desc" };
  }
  return null;
}
