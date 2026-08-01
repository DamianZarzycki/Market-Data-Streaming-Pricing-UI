import type { AssetClass, LiveStatus, TradeSide, TradeStatus } from "@/domain/types";

/** Live SSE / cache valuation payload attached to list items and trade detail. */
export interface BlotterValuationDto {
  trade_id?: string;
  book_id?: string;
  asset_class?: AssetClass;
  symbol?: string;
  side?: TradeSide;
  fair_value?: number;
  market_value?: number | null;
  unrealized_pnl?: number;
  realized_pnl?: number;
  total_pnl?: number;
  currency?: string;
  valuation_time?: string;
  created_at?: string;
  alpha?: number;
  beta?: number;
  pricing_details?: Record<string, unknown>;
  valuation_id?: string;
  market_data_reference?: string | null;
  valuation_payload?: Record<string, unknown> | null;
}

/** Serialized Trade row from blotter-service, optionally with nested valuation. */
export interface BlotterTradeDto {
  trade_id: string;
  book_id: string;
  asset_class: AssetClass;
  instrument_id?: string;
  symbol?: string;
  side?: TradeSide;
  quantity?: number;
  trade_price?: number;
  trade_currency?: string;
  trade_date?: string;
  status?: TradeStatus;
  opened_at?: string;
  closed_at?: string | null;
  close_price?: number | null;
  close_reason?: string | null;
  source?: string;
  client_request_id?: string | null;
  metadata_payload?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  valuation?: BlotterValuationDto | null;
}

export interface BlotterTradesResponse {
  trades: BlotterTradeDto[];
}

export interface BlotterTradeDetailResponse {
  trade: BlotterTradeDto;
  latest_valuation: BlotterValuationDto | null;
  valuation_history: BlotterValuationDto[];
  audit_logs: BlotterAuditLogDto[];
}

export interface BlotterValuationsResponse {
  valuations: BlotterValuationDto[];
}

export interface BlotterAuditLogDto {
  audit_id?: string;
  id?: string;
  event_type: string;
  message: string;
  entity_type?: string;
  correlation_id?: string | null;
  created_at?: string;
  service_name?: string;
  severity?: string;
}

export interface BlotterBookDto {
  book_id: string;
  name: string;
  expected_asset_class: AssetClass;
  is_active: boolean;
  description?: string | null;
  realized_pnl?: number;
  unrealized_pnl?: number;
}

export interface BlotterBooksSummaryResponse {
  books: BlotterBookDto[];
}

export interface FetchTradesParams {
  book_id?: string;
  asset_class?: string;
  status?: string;
  symbol?: string;
  page?: number;
  limit?: number;
}

export type { LiveStatus };
