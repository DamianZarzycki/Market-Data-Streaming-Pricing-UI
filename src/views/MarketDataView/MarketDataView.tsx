import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import {
  useMarketDataStream,
  type MarketDataBatch,
} from "@/hooks/useMarketDataStream";
import { useDensity } from "@/layout/DensityContext";
import {
  collapsedForDensity,
  useCompactLayout,
} from "@/layout/useCompactLayout";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import { ApiError } from "@/services/apiClient";
import {
  appendPriceHistory,
  liveStatusFor,
  mergeTickRows,
} from "@/services/marketDataMappers";
import { fetchMarketDataSnapshot } from "@/services/marketDataService";
import type { MarketTickRow, PricePoint } from "@/services/marketDataTypes";
import { MarketDataDrawer } from "@/views/MarketDataView/MarketDataDrawer";
import {
  MarketDataFilters,
  type DataClassFilter,
  type RowLimit,
} from "@/views/MarketDataView/MarketDataFilters";
import { MarketDataSummaryBar } from "@/views/MarketDataView/MarketDataSummaryBar";
import {
  nextTickSort,
  sortTickRows,
  type TickSortKey,
  type TickSortState,
} from "@/views/MarketDataView/tickSort";
import { TicksTable } from "@/views/MarketDataView/TicksTable";

// #region agent log
let __mdBatchCount = 0;
let __mdRenderCount = 0;
// #endregion

export function MarketDataView() {
  // #region agent log
  __mdRenderCount += 1;
  // #endregion
  const density = useDensity();
  const [ticks, setTicks] = useState<MarketTickRow[]>([]);
  const [priceHistory, setPriceHistory] = useState<Map<string, PricePoint[]>>(
    () => new Map(),
  );
  const [ticksReceived, setTicksReceived] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [symbolQuery, setSymbolQuery] = useState("");
  const [selectedDataClass, setSelectedDataClass] =
    useState<DataClassFilter>("ALL");
  const [rowLimit, setRowLimit] = useState<RowLimit>(25);
  const [sort, setSort] = useState<TickSortState | null>(null);
  const [selectedInstrumentKey, setSelectedInstrumentKey] = useState<
    string | null
  >(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  const [drawerCollapsed, setDrawerCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  useCompactLayout({ setFiltersCollapsed, setDrawerCollapsed });
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    // #region agent log
    let __heapTick = 0;
    let __prevRenders = __mdRenderCount;
    let __prevBatches = __mdBatchCount;
    const __heapId = window.setInterval(() => {
      __heapTick += 1;
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      const rendersDelta = __mdRenderCount - __prevRenders;
      const batchesDelta = __mdBatchCount - __prevBatches;
      __prevRenders = __mdRenderCount;
      __prevBatches = __mdBatchCount;
      fetch('http://127.0.0.1:7406/ingest/b990d8d1-4614-4157-88e1-24bf677abfbc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'82b0ff'},body:JSON.stringify({sessionId:'82b0ff',hypothesisId:'G',location:'MarketDataView.tsx:heapProbe',message:'heap + render churn sample',data:{tick:__heapTick,usedMB:mem?Math.round(mem.usedJSHeapSize/1048576):null,totalMB:mem?Math.round(mem.totalJSHeapSize/1048576):null,rendersPer5s:rendersDelta,batchesPer5s:batchesDelta},timestamp:Date.now()})}).catch(()=>{});
    }, 5000);
    // #endregion
    return () => {
      window.clearInterval(id);
      // #region agent log
      window.clearInterval(__heapId);
      // #endregion
    };
  }, []);

  const seedFromSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMarketDataSnapshot();
      setTicks((current) => mergeTickRows(current, rows));
      setPriceHistory((current) => {
        let next = current;
        for (const row of rows) {
          next = appendPriceHistory(next, row);
        }
        return next;
      });
      if (rows.length > 0) {
        setLastUpdate(rows[0].timestamp);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load market data snapshot";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void seedFromSnapshot();
  }, [seedFromSnapshot]);

  const handleBatch = useCallback((batch: MarketDataBatch) => {
    if (batch.streamReceivedCount != null) {
      setTicksReceived(batch.streamReceivedCount);
    }
    if (batch.rows.length === 0) return;

    // #region agent log
    __mdBatchCount += 1;
    // #endregion

    setTicks((current) => mergeTickRows(current, batch.rows));
    setPriceHistory((current) => {
      let next = current;
      for (const row of batch.rows) {
        next = appendPriceHistory(next, row);
      }
      return next;
    });
    if (batch.streamReceivedCount == null) {
      setTicksReceived((count) => count + batch.ticksInBatch);
    }
    setLastUpdate(batch.rows[0].timestamp);
    setError(null);
  }, []);

  const streamEnabled = !loading || ticks.length > 0;
  const streamStatus = useMarketDataStream(handleBatch, streamEnabled);

  const filteredTicks = useMemo(() => {
    const query = symbolQuery.trim().toLowerCase();
    return ticks.filter((tick) => {
      if (query && !tick.symbol.toLowerCase().includes(query)) {
        return false;
      }
      if (selectedDataClass !== "ALL" && tick.dataClass !== selectedDataClass) {
        return false;
      }
      return true;
    });
  }, [ticks, symbolQuery, selectedDataClass]);

  const sortedTicks = useMemo(() => {
    if (!sort) return filteredTicks;
    // Status ranks depend on wall-clock age; other keys ignore nowMs.
    return sortTickRows(filteredTicks, sort, nowMs);
  }, [filteredTicks, sort, nowMs]);

  const visibleTicks = useMemo(
    () => sortedTicks.slice(0, rowLimit),
    [sortedTicks, rowLimit],
  );

  const handleSortChange = useCallback((key: TickSortKey) => {
    setSort((current) => nextTickSort(current, key));
  }, []);

  const selectedTick = useMemo(() => {
    if (!selectedInstrumentKey) return null;
    return (
      ticks.find((tick) => tick.instrumentKey === selectedInstrumentKey) ?? null
    );
  }, [ticks, selectedInstrumentKey]);

  const selectedHistory = useMemo(() => {
    if (!selectedInstrumentKey) return [];
    return priceHistory.get(selectedInstrumentKey) ?? [];
  }, [priceHistory, selectedInstrumentKey]);

  const selectedStatus = selectedTick
    ? liveStatusFor(selectedTick.receivedAt, nowMs)
    : null;

  const handleClearFilters = useCallback(() => {
    setSymbolQuery("");
    setSelectedDataClass("ALL");
  }, []);

  const tone = streamTone(streamStatus, Boolean(error), loading);
  const label = streamLabel(streamStatus, Boolean(error), loading);

  return (
    <WorkspaceLayout
      ariaLabel="Market data service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <MarketDataFilters
          symbolQuery={symbolQuery}
          selectedDataClass={selectedDataClass}
          rowLimit={rowLimit}
          onSymbolQueryChange={setSymbolQuery}
          onDataClassChange={setSelectedDataClass}
          onRowLimitChange={setRowLimit}
          onClear={handleClearFilters}
          collapsed={filtersCollapsed}
          onToggleCollapse={() => setFiltersCollapsed((value) => !value)}
        />
      }
      main={
        <>
          <PanelHeader
            title="Market Data"
            description="Live ticks via market-data SSE stream"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void seedFromSnapshot()}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Refresh"}
                </Button>
                <StatusPill
                  tone={tone}
                  title={`Market stream: ${streamStatus}`}
                >
                  {label}
                </StatusPill>
              </>
            }
          />

          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void seedFromSnapshot()}
            />
          ) : null}

          <MarketDataSummaryBar
            ticksReceived={ticksReceived}
            lastUpdate={lastUpdate}
            visibleCount={visibleTicks.length}
            matchedCount={filteredTicks.length}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && ticks.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading market snapshot…
              </div>
            ) : (
              <TicksTable
                ticks={visibleTicks}
                selectedInstrumentKey={selectedInstrumentKey}
                nowMs={nowMs}
                sort={sort}
                onSortChange={handleSortChange}
                onSelectTick={setSelectedInstrumentKey}
                emptyMessage={
                  ticks.length === 0
                    ? "Waiting for market-data ticks…"
                    : "No ticks match the current filters."
                }
              />
            )}
          </div>
        </>
      }
      drawer={
        <MarketDataDrawer
          tick={selectedTick}
          status={selectedStatus}
          priceHistory={selectedHistory}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
