export type AssetClass =
  | "EQUITY"
  | "FX"
  | "EUROPEAN_OPTION"
  | "IRS"
  | string;

export type LiveStatus = "LIVE" | "STALE" | "ERROR";

export type ServiceHealth = "UP" | "DOWN" | "DEGRADED";

export interface ServiceStatus {
  service: string;
  status: ServiceHealth;
  responseTimeMs?: number;
  lastCheckedAt?: string;
  errorCount?: number;
}

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
  expected_asset_class: AssetClass;
  is_active: boolean;
  realized_pnl?: number;
  unrealized_pnl?: number;
}

export interface Trade {
  trade_id: string;
  book_id: string;
  asset_class: AssetClass;
  side?: string;
  quantity?: number;
  currency?: string;
  status?: string;
  created_at?: string;
}

export interface AuditLog {
  id?: string;
  event_type: string;
  message: string;
  entity_type?: string;
  correlation_id?: string | null;
  created_at?: string;
}
