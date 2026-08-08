import type { MonitoringServiceHealth } from "@/services/monitoringTypes";
import type { NormalizedMonitoringStatus } from "@/services/monitoringTypes";
import {
  SERVICE_CATALOG,
  type ServiceCatalogEntry,
} from "@/views/SystemOverview/serviceCatalog";

/** Canonical probe order matching monitoring-service worker. */
export const PROBE_KEYS = [
  "market-data-service",
  "pricing-service",
  "trade-generation-service",
  "trade-action-service",
  "book-service",
  "blotter-service",
] as const;

export type ProbeKey = (typeof PROBE_KEYS)[number];

export type ProbeStatus = "UP" | "DOWN" | "UNKNOWN";

export type EnvironmentRollup = "HEALTHY" | "DEGRADED" | "UNKNOWN";

export interface ProbeRow {
  key: ProbeKey;
  status: ProbeStatus;
  responseTimeMs: number | null;
  lastChecked: string | null;
  error: string | null;
  catalog: ServiceCatalogEntry | null;
}

export interface MonitoringKpis {
  servicesUp: number;
  servicesTotal: number;
  downCount: number;
  firstDownKey: string | null;
  avgLatencyMs: number | null;
  slowestMs: number | null;
  slowestKey: string | null;
  lastPollAt: string | null;
  probeErrors: number;
}

export interface StreamOwner {
  key: ProbeKey;
  label: string;
  path: string;
  status: ProbeStatus;
}

export interface SseStripModel {
  upCount: number;
  total: number;
  fillPct: number;
  owners: StreamOwner[];
}

export interface StatusTransition {
  at: string;
  from: ProbeStatus;
  to: ProbeStatus;
  message: string;
}

const HISTORY_CAP = 8;

const PORT_HINT: Partial<Record<ProbeKey, string>> = {
  "market-data-service": ":8001",
  "pricing-service": ":8002",
  "trade-generation-service": ":8007",
  "trade-action-service": ":8080",
  "book-service": ":8004",
  "blotter-service": ":8006",
};

function normalizeStatus(raw: string | undefined): ProbeStatus {
  const value = (raw ?? "").toUpperCase();
  if (value === "UP" || value === "OK" || value === "HEALTHY") return "UP";
  if (value === "DOWN" || value === "ERROR") return "DOWN";
  return "UNKNOWN";
}

function catalogForKey(key: string): ServiceCatalogEntry | null {
  return (
    SERVICE_CATALOG.find((entry) => entry.monitoringKeys.includes(key)) ?? null
  );
}

export function buildProbeRows(
  services: Record<string, MonitoringServiceHealth> | null | undefined,
): ProbeRow[] {
  const map = services ?? {};
  return PROBE_KEYS.map((key) => {
    const health = map[key];
    return {
      key,
      status: health ? normalizeStatus(health.status) : "UNKNOWN",
      responseTimeMs:
        typeof health?.response_time_ms === "number"
          ? health.response_time_ms
          : null,
      lastChecked: health?.last_checked ?? null,
      error: health?.error ?? null,
      catalog: catalogForKey(key),
    };
  });
}

export function deriveRollup(rows: ProbeRow[]): EnvironmentRollup {
  if (rows.length === 0) return "UNKNOWN";
  if (rows.every((row) => row.status === "UNKNOWN")) return "UNKNOWN";
  if (rows.some((row) => row.status === "DOWN")) return "DEGRADED";
  return "HEALTHY";
}

export function deriveKpis(
  rows: ProbeRow[],
  status: NormalizedMonitoringStatus | null,
): MonitoringKpis {
  const known = rows.filter((row) => row.status !== "UNKNOWN");
  const up = known.filter((row) => row.status === "UP");
  const down = known.filter((row) => row.status === "DOWN");
  const withLatency = up.filter((row) => row.responseTimeMs != null);
  const avgLatencyMs =
    withLatency.length > 0
      ? Math.round(
          withLatency.reduce((sum, row) => sum + (row.responseTimeMs ?? 0), 0) /
            withLatency.length,
        )
      : null;

  let slowestMs: number | null = null;
  let slowestKey: string | null = null;
  for (const row of withLatency) {
    if (row.responseTimeMs == null) continue;
    if (slowestMs == null || row.responseTimeMs > slowestMs) {
      slowestMs = row.responseTimeMs;
      slowestKey = row.key;
    }
  }

  let lastPollAt = status?.fetchedAt ?? null;
  for (const row of rows) {
    if (!row.lastChecked) continue;
    if (!lastPollAt || row.lastChecked > lastPollAt) {
      lastPollAt = row.lastChecked;
    }
  }

  return {
    servicesUp: up.length,
    servicesTotal: PROBE_KEYS.length,
    downCount: down.length,
    firstDownKey: down[0]?.key ?? null,
    avgLatencyMs,
    slowestMs,
    slowestKey,
    lastPollAt,
    probeErrors: rows.filter((row) => Boolean(row.error)).length,
  };
}

/** Stream owners inferred from health probes (not EventSource readyState). */
export function deriveSseStrip(rows: ProbeRow[]): SseStripModel {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const owners: StreamOwner[] = [
    {
      key: "market-data-service",
      label: "market-data /stream",
      path: "/stream",
      status: byKey.get("market-data-service")?.status ?? "UNKNOWN",
    },
    {
      key: "pricing-service",
      label: "pricing /valuation-stream",
      path: "/valuation-stream",
      status: byKey.get("pricing-service")?.status ?? "UNKNOWN",
    },
  ];
  const upCount = owners.filter((owner) => owner.status === "UP").length;
  const total = owners.length;
  return {
    upCount,
    total,
    fillPct: total === 0 ? 0 : Math.round((upCount / total) * 100),
    owners,
  };
}

export function defaultSelectedKey(rows: ProbeRow[]): ProbeKey | null {
  const down = rows.find((row) => row.status === "DOWN");
  if (down) return down.key;
  return rows[0]?.key ?? null;
}

export function portHint(key: ProbeKey): string {
  return PORT_HINT[key] ?? "";
}

export function whatThisMeansCopy(row: ProbeRow | null): {
  title: string;
  body: string;
  severity: "ok" | "down" | "unknown";
} {
  if (!row) {
    return {
      title: "No probe selected",
      body: "Select a service row to see what its health status means.",
      severity: "unknown",
    };
  }
  const base =
    row.catalog?.whatThisMeans ??
    "Health probe result from monitoring-service GET /status.";
  if (row.status === "DOWN") {
    return {
      title: "Service unavailable",
      body: `${base} Live dependent flows may stall until ${row.key} recovers.${
        row.error ? ` Probe error: ${row.error}.` : ""
      }`,
      severity: "down",
    };
  }
  if (row.status === "UNKNOWN") {
    return {
      title: "No recent probe",
      body: `${base} Waiting for monitoring-service probe data.`,
      severity: "unknown",
    };
  }
  return {
    title: "Service answering",
    body: base,
    severity: "ok",
  };
}

export function relatedStreamsForSelection(
  key: ProbeKey | null,
  strip: SseStripModel,
): StreamOwner[] {
  if (!key) return [];
  if (key === "market-data-service" || key === "pricing-service") {
    return strip.owners.filter((owner) => owner.key === key);
  }
  return [];
}

/**
 * Append UP↔DOWN transitions for every probe key into a capped ring buffer.
 * Pure helper — caller owns state.
 */
export function mergeTransitions(
  previous: Record<string, ProbeStatus>,
  rows: ProbeRow[],
  history: StatusTransition[],
  at: string,
): { nextPrev: Record<string, ProbeStatus>; nextHistory: StatusTransition[] } {
  const nextPrev: Record<string, ProbeStatus> = { ...previous };
  let nextHistory = [...history];

  for (const row of rows) {
    const prior = previous[row.key];
    if (
      prior &&
      prior !== row.status &&
      (prior === "UP" || prior === "DOWN") &&
      (row.status === "UP" || row.status === "DOWN")
    ) {
      const message =
        row.status === "DOWN"
          ? "Unavailability detected"
          : "Recovery detected";
      nextHistory = [
        {
          at,
          from: prior,
          to: row.status,
          message: `${row.key}: ${message}`,
        },
        ...nextHistory,
      ].slice(0, HISTORY_CAP);
    }
    if (row.status !== "UNKNOWN") {
      nextPrev[row.key] = row.status;
    }
  }

  return { nextPrev, nextHistory };
}

export function historyForKey(
  history: StatusTransition[],
  key: ProbeKey | null,
): StatusTransition[] {
  if (!key) return [];
  return history.filter((item) => item.message.startsWith(`${key}:`));
}
