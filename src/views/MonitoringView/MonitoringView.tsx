import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { ApiError } from "@/services/apiClient";
import {
  fetchMonitoringHealth,
  fetchMonitoringStatus,
} from "@/services/monitoringService";
import type { NormalizedMonitoringStatus } from "@/services/monitoringTypes";
import {
  buildProbeRows,
  defaultSelectedKey,
  deriveKpis,
  deriveRollup,
  deriveSseStrip,
  historyForKey,
  mergeTransitions,
  type ProbeKey,
  type ProbeStatus,
  type StatusTransition,
} from "@/views/MonitoringView/deriveMonitoring";
import { MonitoringDrawer } from "@/views/MonitoringView/MonitoringDrawer";
import { MonitoringKpiStrip } from "@/views/MonitoringView/MonitoringKpiStrip";
import { MonitoringSseStrip } from "@/views/MonitoringView/MonitoringSseStrip";
import { MonitoringStatusBar } from "@/views/MonitoringView/MonitoringStatusBar";
import { ProbeResultsTable } from "@/views/MonitoringView/ProbeResultsTable";

const STATUS_POLL_MS = 2000;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}

interface TransitionTrack {
  prev: Record<string, ProbeStatus>;
  history: StatusTransition[];
}

export function MonitoringView() {
  const [status, setStatus] = useState<NormalizedMonitoringStatus | null>(null);
  const [serviceUp, setServiceUp] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ProbeKey | null>(null);
  const [track, setTrack] = useState<TransitionTrack>({
    prev: {},
    history: [],
  });

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [nextStatus, health] = await Promise.all([
        fetchMonitoringStatus(),
        fetchMonitoringHealth().catch(() => null),
      ]);
      const rows = buildProbeRows(nextStatus.services);
      setStatus(nextStatus);
      setServiceUp(health?.status?.toUpperCase() === "UP");
      setError(null);
      setSelectedKey((current) => {
        if (current && rows.some((row) => row.key === current)) return current;
        return defaultSelectedKey(rows);
      });
      setTrack(({ prev, history }) => {
        const merged = mergeTransitions(
          prev,
          rows,
          history,
          nextStatus.fetchedAt,
        );
        return { prev: merged.nextPrev, history: merged.nextHistory };
      });
    } catch (err) {
      setServiceUp(false);
      setError(errorMessage(err, "Failed to load monitoring status"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh(false);
    }, STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const rows = useMemo(
    () => buildProbeRows(status?.services),
    [status?.services],
  );
  const kpis = useMemo(() => deriveKpis(rows, status), [rows, status]);
  const rollup = useMemo(() => deriveRollup(rows), [rows]);
  const sseStrip = useMemo(() => deriveSseStrip(rows), [rows]);
  const selectedRow = useMemo(
    () => rows.find((row) => row.key === selectedKey) ?? null,
    [rows, selectedKey],
  );
  const selectedHistory = useMemo(
    () => historyForKey(track.history, selectedKey),
    [track.history, selectedKey],
  );

  const downRow = rows.find((row) => row.key === kpis.firstDownKey) ?? null;
  const description =
    rollup === "DEGRADED" && downRow
      ? `${downRow.key} is DOWN${
          downRow.error ? ` · ${downRow.error}` : ""
        } · dependent flows may stall`
      : "Technical health probes · UP/DOWN per service · response times · related stream owners";

  return (
    <WorkspaceLayout
      ariaLabel="Monitoring service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <MonitoringStatusBar
          rollup={rollup}
          kpis={kpis}
          serviceUp={serviceUp}
          loading={loading}
          onRefresh={() => void refresh(true)}
        />
      }
      main={
        <>
          <PanelHeader
            title="Monitoring"
            description={description}
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void refresh(true)}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </Button>
                <StatusPill
                  tone={
                    rollup === "HEALTHY"
                      ? "live"
                      : rollup === "DEGRADED"
                        ? "stale"
                        : "stale"
                  }
                >
                  {rollup === "UNKNOWN" ? "…" : rollup}
                </StatusPill>
              </>
            }
          />

          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void refresh(true)}
            />
          ) : null}

          <MonitoringKpiStrip kpis={kpis} />
          <MonitoringSseStrip strip={sseStrip} />

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-end justify-between gap-2 px-4 pb-2 pt-2.5">
              <div>
                <h2 className="text-base font-semibold">Probe results</h2>
                <p className="text-sm text-text-muted">
                  GET /status · status · response_time_ms · last_checked · error
                </p>
              </div>
              <span className="text-sm text-text-muted">poll 2s</span>
            </div>

            {loading && !status ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading monitoring status…
              </div>
            ) : (
              <ProbeResultsTable
                rows={rows}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            )}
          </div>
        </>
      }
      drawer={
        <MonitoringDrawer
          row={selectedRow}
          relatedStreams={sseStrip.owners}
          history={selectedHistory}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
