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
