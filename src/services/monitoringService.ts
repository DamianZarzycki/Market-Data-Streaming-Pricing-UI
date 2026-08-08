import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import type {
  MonitoringAlert,
  MonitoringEnvironment,
  MonitoringKpis,
  MonitoringServiceHealth,
  MonitoringStatusResponse,
  NormalizedMonitoringStatus,
} from "@/services/monitoringTypes";

function isServiceHealth(value: unknown): value is MonitoringServiceHealth {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  // Current BE always includes status; accept sparse future objects too.
  return (
    typeof record.status === "string" ||
    typeof record.last_checked === "string" ||
    typeof record.response_time_ms === "number"
  );
}

function extractServices(
  raw: MonitoringStatusResponse,
): Record<string, MonitoringServiceHealth> {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "services" in raw &&
    typeof raw.services === "object" &&
    raw.services !== null
  ) {
    const out: Record<string, MonitoringServiceHealth> = {};
    for (const [key, value] of Object.entries(raw.services)) {
      if (isServiceHealth(value)) out[key] = value;
    }
    return out;
  }

  const out: Record<string, MonitoringServiceHealth> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "environment" || key === "kpis" || key === "alerts") continue;
    if (isServiceHealth(value)) out[key] = value;
  }
  return out;
}

function extractEnvironment(
  raw: MonitoringStatusResponse,
): MonitoringEnvironment | null {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "environment" in raw &&
    typeof raw.environment === "object" &&
    raw.environment !== null
  ) {
    return raw.environment as MonitoringEnvironment;
  }
  return null;
}

function extractKpis(raw: MonitoringStatusResponse): MonitoringKpis | null {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "kpis" in raw &&
    typeof raw.kpis === "object" &&
    raw.kpis !== null
  ) {
    return raw.kpis as MonitoringKpis;
  }
  return null;
}

function extractAlerts(raw: MonitoringStatusResponse): MonitoringAlert[] {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "alerts" in raw &&
    Array.isArray(raw.alerts)
  ) {
    return raw.alerts as MonitoringAlert[];
  }
  return [];
}

export function normalizeMonitoringStatus(
  raw: MonitoringStatusResponse,
  probeLatencyMs: number | null,
  fetchedAt = new Date().toISOString(),
): NormalizedMonitoringStatus {
  return {
    services: extractServices(raw),
    environment: extractEnvironment(raw),
    kpis: extractKpis(raw),
    alerts: extractAlerts(raw),
    probeLatencyMs,
    fetchedAt,
  };
}

export interface MonitoringHealth {
  service?: string;
  status?: string;
}

export async function fetchMonitoringHealth(): Promise<MonitoringHealth> {
  return apiClient.get<MonitoringHealth>(endpoints.monitoring.health);
}

export async function fetchMonitoringStatus(): Promise<NormalizedMonitoringStatus> {
  const started = performance.now();
  const raw = await apiClient.get<MonitoringStatusResponse>(
    endpoints.monitoring.status,
  );
  const probeLatencyMs = Math.round(performance.now() - started);
  return normalizeMonitoringStatus(raw, probeLatencyMs);
}
