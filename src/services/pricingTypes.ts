import type { AssetClass, LiveStatus, TradeSide } from "@/domain/types";

/** SSE / snapshot valuation payload from pricing-service. */
export interface PricingValuationDto {
  trade_id?: string;
  book_id?: string;
  asset_class?: AssetClass;
  symbol?: string;
  side?: TradeSide;
  fair_value?: number;
  market_value?: number | null;
  current_price?: number;
  entry_price?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  total_pnl?: number;
  currency?: string;
  valuation_time?: string;
  market_data_provider?: string | null;
  market_data_timestamp?: string | null;
  is_stale?: boolean;
  market_data_age_seconds?: number | null;
  pricing_details?: Record<string, unknown>;
}

/** GET /valuations — map keyed by trade_id. */
export type PricingValuationsSnapshotDto = Record<string, PricingValuationDto>;

export interface PricingBookMetricsDto {
  book_id: string;
  alpha?: number | null;
  beta?: number | null;
  observations?: number;
  window?: number;
  avg_book_return?: number | null;
  avg_benchmark_return?: number | null;
  benchmark_symbol?: string;
  updated_at?: string;
}

export interface PricingBookMetricsResponse {
  benchmark?: string;
  books: Record<string, PricingBookMetricsDto>;
}

export interface PricingHealthDto {
  service?: string;
  status?: string;
  market_data_connection?: string;
  received_events?: number;
  last_market_event_time?: string | null;
  last_pricing_time?: string | null;
}

/** Normalized row for the live valuations table. */
export interface PricingValuationRow {
  tradeId: string;
  bookId: string;
  bookName: string;
  assetClass: AssetClass;
  symbol: string;
  side?: TradeSide;
  fairValue: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  realizedPnl: number | null;
  totalPnl: number | null;
  currency: string | null;
  valuationTime: string;
  receivedAt: number;
  alpha: number | null;
  beta: number | null;
  pricingDetails?: Record<string, unknown>;
}

export interface FrequencyInsight {
  key: string;
  symbol: string;
  assetClass: string;
  ticksPerMin: number;
}

export interface StaleInsight {
  tradeId: string;
  symbol: string;
  bookName: string;
  ageMs: number;
  lastUpdated: string;
}

export interface PnlImpactInsight {
  tradeId: string;
  symbol: string;
  bookName: string;
  unrealizedPnl: number;
}

export interface StreamInsights {
  frequent: FrequencyInsight[];
  stale: StaleInsight[];
  pnlImpact: PnlImpactInsight[];
}

export type PricingStatusFilter = LiveStatus | "ALL";

export type { LiveStatus };
