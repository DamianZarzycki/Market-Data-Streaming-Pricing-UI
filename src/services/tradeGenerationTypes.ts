export interface TradeGenerationConfig {
  interval_ms: number;
  batch_size: number;
  open_weight_pct: number;
  close_weight_pct: number;
  qty_min: number;
  qty_max: number;
  price_min: number;
  price_max: number;
  use_provider_data: boolean;
}

export type TradeGenerationConfigPatch = Partial<TradeGenerationConfig>;

export interface TradeGenerationStatus {
  is_running: boolean;
  total_generated: number;
  expected_rate_per_sec?: number;
}

export interface TradeGenerationHealth {
  service: string;
  status: string;
}

export interface TradeGenerationConfigUpdateResponse {
  message: string;
  config: TradeGenerationConfig;
}

export interface LastApiResponse {
  method: string;
  path: string;
  at: string;
  ok: boolean;
  body: unknown;
}
