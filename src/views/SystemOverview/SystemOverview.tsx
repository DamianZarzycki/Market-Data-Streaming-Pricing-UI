import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { fetchBooks, fetchTrades } from "@/services/blotterService";
import { fetchMonitoringStatus } from "@/services/monitoringService";
import type { NormalizedMonitoringStatus } from "@/services/monitoringTypes";
import {
  attentionCards,
  deriveEnvironment,
  deriveKpis,
  deriveServiceCards,
} from "@/views/SystemOverview/deriveOverview";
import { formatClock } from "@/views/SystemOverview/formatters";
import type { OverviewServiceId } from "@/views/SystemOverview/serviceCatalog";
import { getServiceCatalog } from "@/views/SystemOverview/serviceCatalog";
import { ServiceStatusGrid } from "@/views/SystemOverview/ServiceStatusGrid";
import { SystemOverviewDrawer } from "@/views/SystemOverview/SystemOverviewDrawer";
import { SystemOverviewKpiStrip } from "@/views/SystemOverview/SystemOverviewKpiStrip";
import { SystemOverviewStatusBar } from "@/views/SystemOverview/SystemOverviewStatusBar";

const STATUS_POLL_MS = 2000;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function SystemOverview() {
  const navigate = useNavigate();
  const density = useDensity();
  const [monitoring, setMonitoring] =
    useState<NormalizedMonitoringStatus | null>(null);
  const [monitoringReachable, setMonitoringReachable] = useState(false);
  const [blotterAgg, setBlotterAgg] = useState<{
    realizedPnl: number | null;
    unrealizedPnl: number | null;
    activeTrades: number | null;
    books: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerCollapsed, setDrawerCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  useCompactLayout({ setDrawerCollapsed });
  const [selectedId, setSelectedId] = useState<OverviewServiceId | null>(
    null,
  );
  const [asOf, setAsOf] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const monitoringPromise = fetchMonitoringStatus()
      .then((status) => ({ ok: true as const, status }))
      .catch((err) => ({ ok: false as const, err }));

    const blotterPromise = Promise.all([
      fetchBooks().catch(() => null),
      fetchTrades({ status: "ACTIVE", limit: 500 }).catch(() => null),
    ]).then(([books, trades]) => {
      if (!books && !trades) return null;
      const activeBooks = (books ?? []).filter((b) => b.is_active);
      const realized =
        books?.reduce((sum, b) => sum + (b.realized_pnl ?? 0), 0) ?? null;
      const unrealized =
        books?.reduce((sum, b) => sum + (b.unrealized_pnl ?? 0), 0) ?? null;
      return {
        realizedPnl: books ? realized : null,
        unrealizedPnl: books ? unrealized : null,
        activeTrades: trades ? trades.length : null,
        books: books ? activeBooks.length : null,
      };
    });

    const [monResult, blotter] = await Promise.all([
      monitoringPromise,
      blotterPromise,
    ]);

    setBlotterAgg(blotter);
    setAsOf(new Date().toISOString());

    if (monResult.ok) {
      setMonitoring(monResult.status);
      setMonitoringReachable(true);
      setError(null);
    } else {
      setMonitoring(null);
      setMonitoringReachable(false);
      // Soft error: overview still usable with blotter KPIs + UNKNOWN cards.
      setError(
        errorMessage(
          monResult.err,
          "Monitoring unreachable — service cards limited",
        ),
      );
    }

    if (showLoading) setLoading(false);
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

  const cards = useMemo(
    () => deriveServiceCards(monitoring, monitoringReachable),
    [monitoring, monitoringReachable],
  );

  const environment = useMemo(
    () =>
      deriveEnvironment(
        cards,
        monitoring?.environment ?? null,
        monitoringReachable,
      ),
    [cards, monitoring, monitoringReachable],
  );

  const kpis = useMemo(
    () =>
      deriveKpis(
        monitoring?.kpis ?? null,
        blotterAgg,
        monitoring?.environment ?? null,
      ),
    [monitoring, blotterAgg],
  );

  const attention = useMemo(() => attentionCards(cards), [cards]);
  const selected = useMemo(
    () => cards.find((c) => c.id === selectedId) ?? null,
    [cards, selectedId],
  );

  const openService = useCallback(
    (id: OverviewServiceId) => {
      navigate(getServiceCatalog(id).route);
    },
    [navigate],
  );

  const liveTone =
    environment.status === "HEALTHY"
      ? "live"
      : environment.status === "DOWN"
        ? "error"
        : "stale";

  return (
    <WorkspaceLayout
      ariaLabel="System overview"
      drawerCollapsed={drawerCollapsed}
      filters={
        <SystemOverviewStatusBar
          environment={environment}
          lastRefreshAt={asOf}
          loading={loading}
          onRefresh={() => void refresh(true)}
        />
      }
      main={
        <>
          <PanelHeader
            title="System Overview"
            description="At-a-glance health for trading services, PnL, and data freshness"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void refresh(true)}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </Button>
                <StatusPill tone={liveTone}>
                  {monitoringReachable ? "LIVE" : "OFFLINE"}
                </StatusPill>
                <span className="font-mono text-sm tabular-nums text-text-muted">
                  as of {formatClock(asOf)}
                </span>
              </>
            }
          />

          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void refresh(true)}
            />
          ) : null}

          <SystemOverviewKpiStrip kpis={kpis} />

          {loading && !monitoring && !blotterAgg ? (
            <div className="px-4 py-8 text-center text-text-muted">
              Loading system overview…
            </div>
          ) : (
            <ServiceStatusGrid
              cards={cards}
              selectedId={selectedId}
              onSelect={(id) =>
                setSelectedId((current) => (current === id ? null : id))
              }
              onOpen={openService}
            />
          )}
        </>
      }
      drawer={
        <SystemOverviewDrawer
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((v) => !v)}
          environment={environment}
          kpis={kpis}
          attention={attention}
          selected={selected}
        />
      }
    />
  );
}
