export type AssetClass =
  | "EQUITY"
  | "FX"
  | "BOND"
  | "OPTION"
  | "IRS"
  | "FUTURES"
  | string;

export type LiveStatus = "LIVE" | "STALE" | "ERROR";

export type ServiceHealth = "UP" | "DOWN" | "DEGRADED";

export type TradeStatus = "ACTIVE" | "CLOSED" | "CANCELLED" | string;

export type TradeSide = "BUY" | "SELL" | string;

export interface ServiceStatus {
  service: string;
  status: ServiceHealth;
  responseTimeMs?: number;
  lastCheckedAt?: string;
  errorCount?: number;
}

/** @deprecated Prefer MarketTickRow from marketDataTypes — SSE payloads are heterogeneous. */
export interface MarketTick {
  symbol: string;
  price: number;
  dataClass?: string;
  timestamp: string;
  status?: LiveStatus;
}

export interface Valuation {
  event_type?: string;
  trade_id: string;
  book_id: string;
  asset_class: AssetClass;
  fair_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  valuation_status: LiveStatus;
  created_at: string;
  alpha?: number;
  beta?: number;
}

export interface Book {
  book_id: string;
  name: string;
  description?: string | null;
  expected_asset_class: AssetClass;
  is_active: boolean;
  realized_pnl?: number;
  unrealized_pnl?: number;
  active_trades?: number;
}

export interface Trade {
  trade_id: string;
  book_id: string;
  book_name?: string;
  asset_class: AssetClass;
  symbol?: string;
  side?: TradeSide;
  quantity?: number;
  trade_price?: number;
  currency?: string;
  status?: TradeStatus;
  created_at?: string;
  realized_pnl?: number;
  unrealized_pnl?: number;
  alpha?: number;
  beta?: number;
  valuation_status?: LiveStatus;
}

export interface AuditLog {
  id?: string;
  event_type: string;
  message: string;
  entity_type?: string;
  correlation_id?: string | null;
  created_at?: string;
}

export interface PortfolioSummary {
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  alpha: number;
  beta: number;
}
