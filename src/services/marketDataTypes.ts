import type { LiveStatus } from "@/domain/types";

/** Data-class discriminator used for filters / table column. */
export type MarketDataClass =
  | "OPTION"
  | "IRS"
  | "BENCHMARK"
  | "YIELD_CURVE"
  | "EQUITY"
  | "FX"
  | "BOND"
  | string;

/** Raw SSE / snapshot instrument payload (heterogeneous fields). */
export interface MarketDataTickDto {
  event_id?: number;
  timestamp?: string;
  asset_type?: string;
  curve_type?: string;
  curve_id?: string;
  curve_name?: string;
  symbol?: string;
  currency?: string;
  spot?: number;
  last?: number;
  bid?: number;
  ask?: number;
  yield?: number;
  fixed_rate?: number;
  notional?: number;
  strike?: number;
  volatility?: number;
  option_right_type?: string;
  maturity_years?: number;
  payments_per_year?: number;
  direction?: string;
  tenors?: string[];
  rates?: number[];
  [key: string]: unknown;
}

/** Snapshot response: instrument key → latest tick. */
export type MarketDataSnapshotDto = Record<string, MarketDataTickDto>;

/** One aggregated sample for the sparkline. `t` is market time (epoch ms, 1s bucket). */
export interface PricePoint {
  t: number;
  price: number;
}

/** Normalized row for the Market Data table / drawer. */
export interface MarketTickRow {
  id: string;
  instrumentKey: string;
  symbol: string;
  dataClass: MarketDataClass;
  price: number | null;
  currency: string | null;
  timestamp: string;
  receivedAt: number;
  eventId?: number;
  raw: MarketDataTickDto;
}

export type { LiveStatus };
