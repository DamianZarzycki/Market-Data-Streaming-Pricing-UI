import type { StatusTone } from "@/components/ui/StatusPill";
import type {
  MonitoringAlert,
  MonitoringEnvironment,
  MonitoringKpis,
  MonitoringServiceHealth,
  NormalizedMonitoringStatus,
} from "@/services/monitoringTypes";
import {
  SERVICE_CATALOG,
  type OverviewServiceId,
  type ServiceCatalogEntry,
} from "@/views/SystemOverview/serviceCatalog";

const STALE_AFTER_MS = 90_000;

export type DerivedServiceStatus = "LIVE" | "UP" | "STALE" | "DOWN" | "UNKNOWN";

export interface DerivedServiceCard {
  id: OverviewServiceId;
  catalog: ServiceCatalogEntry;
  status: DerivedServiceStatus;
  tone: StatusTone;
  latencyMs: number | null;
  lastEventLabel: string | null;
  lastCheckedAt: string | null;
  errors5m: number | null;
  footer: string;
  health: MonitoringServiceHealth | null;
  alerts: MonitoringAlert[];
}

export interface OverviewKpis {
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  activeTrades: number | null;
  books: number | null;
  errors5m: number | null;
  errorsDetail: string | null;
  lastMarketTick: string | null;
  lastMarketTickDetail: string | null;
  lastValuation: string | null;
  lastValuationDetail: string | null;
  source: "monitoring" | "blotter" | "mixed" | "none";
}

export interface OverviewEnvironment {
  status: "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";
  message: string;
  servicesUp: number;
  servicesTotal: number;
  dataWindow: string;
}

function normalizeStatusToken(raw: string | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

function findHealth(
  services: Record<string, MonitoringServiceHealth>,
  keys: string[],
): MonitoringServiceHealth | null {
  for (const key of keys) {
    if (services[key]) return services[key];
  }
  // Case-insensitive fallback for future key renames.
  const lowerMap = new Map(
    Object.entries(services).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const hit = lowerMap.get(key.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function isStaleTimestamp(iso: string | null | undefined, nowMs: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return nowMs - t > STALE_AFTER_MS;
}

function deriveStatus(
  catalog: ServiceCatalogEntry,
  health: MonitoringServiceHealth | null,
  nowMs: number,
  monitoringReachable: boolean,
): DerivedServiceStatus {
  if (catalog.id === "monitoring") {
    if (!monitoringReachable) return "DOWN";
    if (health && isStaleTimestamp(health.last_checked, nowMs)) return "STALE";
    return catalog.streaming ? "LIVE" : "UP";
  }

  if (!health) {
    // Probe map missing this service — unknown, not necessarily down.
    return monitoringReachable ? "UNKNOWN" : "UNKNOWN";
  }

  const token = normalizeStatusToken(health.status);
  if (token === "DOWN" || token === "ERROR" || token === "UNAVAILABLE") {
    return "DOWN";
  }
  if (token === "DEGRADED" || token === "STALE") {
    return "STALE";
  }
  if (isStaleTimestamp(health.last_checked, nowMs)) {
    return "STALE";
  }
  if (token === "LIVE" || (catalog.streaming && (token === "UP" || token === "OK"))) {
    return catalog.streaming ? "LIVE" : "UP";
  }
  if (token === "UP" || token === "OK" || token === "HEALTHY") {
    return catalog.streaming ? "LIVE" : "UP";
  }
  return "UNKNOWN";
}

function statusTone(status: DerivedServiceStatus): StatusTone {
  if (status === "DOWN") return "error";
  if (status === "STALE" || status === "UNKNOWN") return "stale";
  if (status === "UP") return "up";
  return "live";
}

function defaultFooter(
  status: DerivedServiceStatus,
  health: MonitoringServiceHealth | null,
): string {
  if (health?.summary) return health.summary;
  if (health?.message) return health.message;
  if (health?.error) return health.error;
  switch (status) {
    case "LIVE":
      return "Streaming normally";
    case "UP":
      return "Reachable";
    case "STALE":
      return "Heartbeat delayed";
    case "DOWN":
      return "Unreachable";
    default:
      return "No probe data yet";
  }
}

export function deriveServiceCards(
  monitoring: NormalizedMonitoringStatus | null,
  monitoringReachable: boolean,
  nowMs = Date.now(),
): DerivedServiceCard[] {
  return SERVICE_CATALOG.map((catalog) => {
    let health = monitoring
      ? findHealth(monitoring.services, catalog.monitoringKeys)
      : null;

    // Synthetic monitoring card when not in probe map.
    if (catalog.id === "monitoring" && !health && monitoringReachable && monitoring) {
      health = {
        status: "UP",
        last_checked: monitoring.fetchedAt,
        response_time_ms: monitoring.probeLatencyMs ?? undefined,
        summary: "Probe endpoint reachable",
      };
    }

    const status = deriveStatus(
      catalog,
      health,
      nowMs,
      monitoringReachable,
    );

    const lastEventLabel =
      health?.last_event ??
      (health?.last_event_at ? "event" : null);

    return {
      id: catalog.id,
      catalog,
      status,
      tone: statusTone(status),
      latencyMs:
        health?.response_time_ms ??
        (catalog.id === "monitoring"
          ? (monitoring?.probeLatencyMs ?? null)
          : null),
      lastEventLabel,
      lastCheckedAt: health?.last_checked ?? null,
      errors5m:
        typeof health?.errors_5m === "number" ? health.errors_5m : null,
      footer: defaultFooter(status, health),
      health,
      alerts: health?.alerts ?? [],
    };
  });
}

export function deriveEnvironment(
  cards: DerivedServiceCard[],
  env: MonitoringEnvironment | null,
  monitoringReachable: boolean,
): OverviewEnvironment {
  const known = cards.filter((c) => c.status !== "UNKNOWN");
  const up = known.filter(
    (c) => c.status === "LIVE" || c.status === "UP",
  ).length;
  const total = known.length || cards.length;
  const down = known.filter((c) => c.status === "DOWN").length;
  const stale = known.filter((c) => c.status === "STALE").length;

  if (env?.status) {
    const token = normalizeStatusToken(env.status);
    const status =
      token === "HEALTHY" || token === "OK" || token === "UP"
        ? "HEALTHY"
        : token === "DOWN"
          ? "DOWN"
          : token === "DEGRADED" || token === "STALE"
            ? "DEGRADED"
            : "UNKNOWN";
    return {
      status,
      message:
        env.message ??
        (status === "HEALTHY"
          ? "All probed services look healthy"
          : "Attention needed"),
      servicesUp: env.services_up ?? up,
      servicesTotal: env.services_total ?? total,
      dataWindow: env.data_window ?? "last 5 min",
    };
  }

  if (!monitoringReachable) {
    return {
      status: "DOWN",
      message: "Monitoring unreachable · health probes unavailable",
      servicesUp: 0,
      servicesTotal: total,
      dataWindow: "last 5 min",
    };
  }

  if (down > 0) {
    return {
      status: "DEGRADED",
      message: `Attention needed · ${down} service${down === 1 ? "" : "s"} down`,
      servicesUp: up,
      servicesTotal: total,
      dataWindow: "last 5 min",
    };
  }

  if (stale > 0) {
    return {
      status: "DEGRADED",
      message: `Attention needed · ${stale} service${stale === 1 ? "" : "s"} stale`,
      servicesUp: up,
      servicesTotal: total,
      dataWindow: "last 5 min",
    };
  }

  if (known.length === 0) {
    return {
      status: "UNKNOWN",
      message: "Waiting for first probe results",
      servicesUp: 0,
      servicesTotal: total,
      dataWindow: "last 5 min",
    };
  }

  return {
    status: "HEALTHY",
    message: "All probed services look healthy",
    servicesUp: up,
    servicesTotal: total,
    dataWindow: "last 5 min",
  };
}

export function deriveKpis(
  monitoringKpis: MonitoringKpis | null,
  blotter: {
    realizedPnl: number | null;
    unrealizedPnl: number | null;
    activeTrades: number | null;
    books: number | null;
  } | null,
  env: MonitoringEnvironment | null,
): OverviewKpis {
  const fromMon = monitoringKpis;
  const hasMon =
    fromMon != null &&
    Object.values(fromMon).some((v) => v !== undefined && v !== null);
  const hasBlotter = blotter != null;

  let source: OverviewKpis["source"] = "none";
  if (hasMon && hasBlotter) source = "mixed";
  else if (hasMon) source = "monitoring";
  else if (hasBlotter) source = "blotter";

  return {
    realizedPnl: fromMon?.realized_pnl ?? blotter?.realizedPnl ?? null,
    unrealizedPnl: fromMon?.unrealized_pnl ?? blotter?.unrealizedPnl ?? null,
    activeTrades: fromMon?.active_trades ?? blotter?.activeTrades ?? null,
    books: fromMon?.books ?? blotter?.books ?? null,
    errors5m: fromMon?.errors_5m ?? env?.errors_5m ?? null,
    errorsDetail: fromMon?.errors_detail ?? null,
    lastMarketTick:
      fromMon?.last_market_tick ?? env?.last_market_tick ?? null,
    lastMarketTickDetail:
      fromMon?.last_market_tick_detail ??
      env?.last_market_tick_detail ??
      env?.last_market_tick_symbol ??
      null,
    lastValuation: fromMon?.last_valuation ?? env?.last_valuation ?? null,
    lastValuationDetail:
      fromMon?.last_valuation_detail ?? env?.last_valuation_detail ?? null,
    source,
  };
}

export function attentionCards(cards: DerivedServiceCard[]): DerivedServiceCard[] {
  return cards.filter(
    (c) => c.status === "DOWN" || c.status === "STALE",
  );
}
