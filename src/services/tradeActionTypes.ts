export type ActionResult =
  | "PROCESSED"
  | "REJECTED"
  | "DUPLICATE"
  | "ERROR"
  | "QUEUED";

export type PipelineStatus = "HEALTHY" | "PRESSURE";

export interface TradeActionQueue {
  depth: number;
  capacity: number;
  fill_pct: number;
  backpressure: boolean;
}

export interface TradeActionEvent {
  time: string;
  client_request_id: string;
  action_type: string;
  symbol: string;
  result: ActionResult | string;
  latency_ms: number | null;
  note: string;
}

export interface TradeActionReject {
  time: string;
  reason: string;
  client_request_id: string;
}

export interface TradeActionStatus {
  service: string;
  pipeline_status: PipelineStatus | string;
  worker_running: boolean;
  queue: TradeActionQueue;
  throughput_per_min: number;
  processed: number;
  errors: number;
  avg_latency_ms: number | null;
  rejected_400: number;
  overload_503: number;
  duplicates: number;
  last_db_write: string | null;
  recent_actions: TradeActionEvent[];
  recent_rejects: TradeActionReject[];
}

export interface TradeActionHealth {
  service: string;
  status: string;
}

/** POST /trade-actions body for a manually booked OPEN_TRADE (trading ticket). */
interface OpenTradeBase {
  action_type: "OPEN_TRADE";
  client_request_id: string;
  book_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  trade_price: number;
  currency: string;
  market_data_provider: string;
  reference_price: number;
  /** Must be formatted as YYYY-MM-DDTHH:MM:SSZ. */
  reference_price_timestamp: string;
  source: "TRADING_TICKET";
}

export interface SpotOpenTradePayload extends OpenTradeBase {
  asset_class: "EQUITY" | "FX" | "BOND";
}

export type IrsDirection =
  | "PAY_FIXED_RECEIVE_FLOAT"
  | "RECEIVE_FIXED_PAY_FLOAT";

export interface IrsOpenTradePayload extends OpenTradeBase {
  asset_class: "IRS";
  notional: number;
  /** Decimal, e.g. 0.035 for 3.5%. */
  fixed_rate: number;
  maturity_years: number;
  payments_per_year: number;
  direction: IrsDirection;
}

export interface EuropeanOptionOpenTradePayload extends OpenTradeBase {
  asset_class: "OPTION";
  option_type: "EUROPEAN";
  option_right_type: "CALL" | "PUT";
  strike: number;
  maturity_years: number;
  /** Decimal, e.g. 0.2 for 20%. */
  volatility: number;
  option_price: number;
  spot: number;
}

export interface FuturesOpenTradePayload extends OpenTradeBase {
  asset_class: "FUTURES";
  contract_multiplier: number;
  underlying_symbol: string;
}

export type OpenTradeActionPayload =
  | SpotOpenTradePayload
  | IrsOpenTradePayload
  | EuropeanOptionOpenTradePayload
  | FuturesOpenTradePayload;

export interface SubmitTradeActionResponse {
  message?: string;
  client_request_id?: string;
  error?: string;
}
