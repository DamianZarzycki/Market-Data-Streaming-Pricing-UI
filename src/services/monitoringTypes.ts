/** Per-service probe result from monitoring-service (current + future fields). */
export interface MonitoringServiceHealth {
  status?: string;
  last_checked?: string;
  response_time_ms?: number;
  error?: string;
  /** Future enrichment */
  errors_5m?: number;
  last_event?: string;
  last_event_at?: string;
  message?: string;
  summary?: string;
  latency_p50_ms?: number;
  latency_p99_ms?: number;
  ticks_per_min?: number;
  throughput_per_min?: number;
  alerts?: MonitoringAlert[];
}

export interface MonitoringAlert {
  severity?: string;
  level?: string;
  message?: string;
  time?: string;
  created_at?: string;
}

/** Future environment rollup (not returned by BE today). */
export interface MonitoringEnvironment {
  status?: string;
  message?: string;
  services_up?: number;
  services_total?: number;
  data_window?: string;
  errors_5m?: number;
  errors_by_service?: Record<string, number>;
  last_market_tick?: string;
  last_market_tick_symbol?: string;
  last_market_tick_detail?: string;
  last_valuation?: string;
  last_valuation_detail?: string;
}

/** Future KPI rollup (not returned by BE today). */
export interface MonitoringKpis {
  realized_pnl?: number;
  unrealized_pnl?: number;
  active_trades?: number;
  books?: number;
  errors_5m?: number;
  errors_detail?: string;
  last_market_tick?: string;
  last_market_tick_detail?: string;
  last_valuation?: string;
  last_valuation_detail?: string;
}

/**
 * Current BE: flat map of service-name → health.
 * Future: optional wrapper with environment / kpis / alerts.
 */
export type MonitoringStatusResponse =
  | Record<string, MonitoringServiceHealth>
  | {
      services?: Record<string, MonitoringServiceHealth>;
      environment?: MonitoringEnvironment;
      kpis?: MonitoringKpis;
      alerts?: MonitoringAlert[];
    };

export interface NormalizedMonitoringStatus {
  services: Record<string, MonitoringServiceHealth>;
  environment: MonitoringEnvironment | null;
  kpis: MonitoringKpis | null;
  alerts: MonitoringAlert[];
  /** Client-measured round-trip for GET /status (ms). */
  probeLatencyMs: number | null;
  fetchedAt: string;
}
