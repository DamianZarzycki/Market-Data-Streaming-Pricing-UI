export interface TradeGenerationStatus {
  is_running: boolean;
  total_generated: number;
}

export interface TradeGenerationHealth {
  service: string;
  status: string;
}

export interface LastApiResponse {
  method: string;
  path: string;
  at: string;
  ok: boolean;
  body: unknown;
}
