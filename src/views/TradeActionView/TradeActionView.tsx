import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useDensity } from "@/layout/DensityContext";
import {
  collapsedForDensity,
  useCompactLayout,
} from "@/layout/useCompactLayout";
import { ApiError } from "@/services/apiClient";
import {
  fetchTradeActionHealth,
  fetchTradeActionStatus,
} from "@/services/tradeActionService";
import type { TradeActionStatus } from "@/services/tradeActionTypes";
import { RecentActionsTable } from "@/views/TradeActionView/RecentActionsTable";
import { TradeActionDrawer } from "@/views/TradeActionView/TradeActionDrawer";
import { TradeActionKpiStrip } from "@/views/TradeActionView/TradeActionKpiStrip";
import { TradeActionQueueBar } from "@/views/TradeActionView/TradeActionQueueBar";
import { TradeActionStatusBar } from "@/views/TradeActionView/TradeActionStatusBar";

const STATUS_POLL_MS = 2000;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function TradeActionView() {
  const density = useDensity();
  const [status, setStatus] = useState<TradeActionStatus | null>(null);
  const [serviceUp, setServiceUp] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerCollapsed, setDrawerCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  useCompactLayout({ setDrawerCollapsed });

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [nextStatus, health] = await Promise.all([
        fetchTradeActionStatus(),
        fetchTradeActionHealth().catch(() => null),
      ]);
      setStatus(nextStatus);
      setServiceUp(health?.status?.toUpperCase() === "UP");
      setError(null);
    } catch (err) {
      setServiceUp(false);
      setError(errorMessage(err, "Failed to load trade-action status"));
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

  const pipeline = status?.pipeline_status ?? null;
  const pressure = pipeline === "PRESSURE";

  return (
    <WorkspaceLayout
      ariaLabel="Trade action service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <TradeActionStatusBar
          status={status}
          serviceUp={serviceUp}
          loading={loading}
          onRefresh={() => void refresh(true)}
        />
      }
      main={
        <>
          <PanelHeader
            title="Trade Action"
            description="Observability for accept → queue → worker → DB (throughput, latency, queue, rejects)"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void refresh(true)}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </Button>
                {pipeline ? (
                  <StatusPill tone={pressure ? "stale" : "live"}>
                    {pipeline}
                  </StatusPill>
                ) : null}
              </>
            }
          />

          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void refresh(true)}
            />
          ) : null}

          <TradeActionKpiStrip status={status} />
          <TradeActionQueueBar queue={status?.queue ?? null} />

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-end justify-between gap-2 px-4 pb-2 pt-2.5">
              <div>
                <h2 className="text-base font-semibold">Recent actions</h2>
                <p className="text-sm text-text-muted">
                  Accepted / processed / rejected from Trade Generation → Trade
                  Action
                </p>
              </div>
            </div>

            {loading && !status ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading trade-action status…
              </div>
            ) : (
              <RecentActionsTable actions={status?.recent_actions ?? []} />
            )}
          </div>
        </>
      }
      drawer={
        <TradeActionDrawer
          status={status}
          serviceUp={serviceUp}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
