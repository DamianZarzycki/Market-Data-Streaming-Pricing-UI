import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import type { Book } from "@/domain/types";
import {
  usePricingValuationStream,
  type PricingValuationBatch,
} from "@/hooks/usePricingValuationStream";
import { useCompactLayout, collapsedForDensity } from "@/layout/useCompactLayout";
import { useDensity } from "@/layout/DensityContext";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import { ApiError } from "@/services/apiClient";
import { listBooks } from "@/services/booksService";
import {
  applyBookMetrics,
  deriveStreamInsights,
  liveStatusFor,
  mapValuationDto,
  mergeValuationRows,
  recordUpdateTimestamps,
} from "@/services/pricingMappers";
import {
  fetchBookMetrics,
  fetchPricingValuations,
} from "@/services/pricingService";
import type { PricingBookMetricsDto, PricingValuationRow } from "@/services/pricingTypes";
import { PricingDrawer } from "@/views/PricingView/PricingDrawer";
import {
  PricingFilters,
  type AssetClassFilter,
  type BookFilter,
  type StatusFilter,
} from "@/views/PricingView/PricingFilters";
import { PricingSummaryBar } from "@/views/PricingView/PricingSummaryBar";
import {
  nextValuationSort,
  sortValuationRows,
  type ValuationSortKey,
  type ValuationSortState,
} from "@/views/PricingView/valuationSort";
import { ValuationsTable } from "@/views/PricingView/ValuationsTable";

const METRICS_POLL_MS = 5_000;

export function PricingView() {
  const density = useDensity();
  const [books, setBooks] = useState<Book[]>([]);
  const [rows, setRows] = useState<PricingValuationRow[]>([]);
  const [updates, setUpdates] = useState(0);
  const [updateTimestamps, setUpdateTimestamps] = useState(
    () => new Map<string, number[]>(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedBookId, setSelectedBookId] = useState<BookFilter>("ALL");
  const [selectedAssetClass, setSelectedAssetClass] =
    useState<AssetClassFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<ValuationSortState | null>(null);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  const [drawerCollapsed, setDrawerCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  useCompactLayout({ setFiltersCollapsed, setDrawerCollapsed });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const bookNamesRef = useRef<Record<string, string>>({});
  const metricsRef = useRef<Record<string, PricingBookMetricsDto>>({});

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const seedSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookList, metrics] = await Promise.all([
        listBooks().catch(() => [] as Book[]),
        fetchBookMetrics(),
      ]);

      const names: Record<string, string> = {};
      for (const book of bookList) {
        names[book.book_id] = book.name;
      }
      bookNamesRef.current = names;
      metricsRef.current = metrics;
      setBooks(bookList);

      const snapshot = await fetchPricingValuations(names, metrics);
      setRows(snapshot);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load valuations";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void seedSnapshot();
  }, [seedSnapshot]);

  // Periodic book α/β refresh (metrics are book-level, not on SSE payload).
  useEffect(() => {
    const tick = async () => {
      const metrics = await fetchBookMetrics();
      metricsRef.current = metrics;
      setRows((current) =>
        applyBookMetrics(current, metrics, bookNamesRef.current),
      );
    };
    const id = window.setInterval(() => void tick(), METRICS_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const handleBatch = useCallback((batch: PricingValuationBatch) => {
    if (batch.streamReceivedCount != null) {
      setUpdates(batch.streamReceivedCount);
    }
    if (batch.updates.size === 0) return;

    const now = Date.now();
    const mapped: PricingValuationRow[] = [];
    const symbols: string[] = [];

    for (const [tradeId, dto] of batch.updates) {
      const row = mapValuationDto(dto, {
        bookNames: bookNamesRef.current,
        metrics: metricsRef.current[String(dto.book_id ?? "")] ?? null,
        receivedAt: now,
        tradeIdFallback: tradeId,
      });
      if (!row) continue;
      mapped.push(row);
      symbols.push(row.symbol);
    }

    setRows((current) => mergeValuationRows(current, mapped));
    if (batch.streamReceivedCount == null) {
      setUpdates((count) => count + batch.eventsInBatch);
    }
    setUpdateTimestamps((current) =>
      recordUpdateTimestamps(current, symbols, now),
    );
    setError(null);
  }, []);

  const streamEnabled = !loading || rows.length > 0;
  const streamStatus = usePricingValuationStream(handleBatch, streamEnabled);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedBookId !== "ALL" && row.bookId !== selectedBookId) {
        return false;
      }
      if (
        selectedAssetClass !== "ALL" &&
        row.assetClass !== selectedAssetClass
      ) {
        return false;
      }
      if (selectedStatus !== "ALL") {
        const status = liveStatusFor(row.receivedAt, nowMs);
        if (status !== selectedStatus) return false;
      }
      return true;
    });
  }, [rows, selectedBookId, selectedAssetClass, selectedStatus, nowMs]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    return sortValuationRows(filteredRows, sort, nowMs);
  }, [filteredRows, sort, nowMs]);

  const handleSortChange = useCallback((key: ValuationSortKey) => {
    setSort((current) => nextValuationSort(current, key));
  }, []);

  const liveCount = useMemo(
    () =>
      filteredRows.filter(
        (row) => liveStatusFor(row.receivedAt, nowMs) === "LIVE",
      ).length,
    [filteredRows, nowMs],
  );
  const staleCount = filteredRows.length - liveCount;
  const sumUnrealized = useMemo(
    () =>
      filteredRows.reduce((sum, row) => sum + (row.unrealizedPnl ?? 0), 0),
    [filteredRows],
  );

  const selectedRow = useMemo(() => {
    if (!selectedTradeId) return null;
    return rows.find((row) => row.tradeId === selectedTradeId) ?? null;
  }, [rows, selectedTradeId]);

  const selectedStatusTone = selectedRow
    ? liveStatusFor(selectedRow.receivedAt, nowMs)
    : null;

  const insights = useMemo(
    () => deriveStreamInsights(rows, updateTimestamps, nowMs),
    [rows, updateTimestamps, nowMs],
  );

  const handleClearFilters = useCallback(() => {
    setSelectedBookId("ALL");
    setSelectedAssetClass("ALL");
    setSelectedStatus("ALL");
  }, []);

  const tone = streamTone(streamStatus, Boolean(error), loading);
  const label = streamLabel(streamStatus, Boolean(error), loading);

  return (
    <WorkspaceLayout
      ariaLabel="Pricing service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <PricingFilters
          books={books}
          selectedBookId={selectedBookId}
          selectedAssetClass={selectedAssetClass}
          selectedStatus={selectedStatus}
          onBookChange={setSelectedBookId}
          onAssetClassChange={setSelectedAssetClass}
          onStatusChange={setSelectedStatus}
          onClear={handleClearFilters}
          collapsed={filtersCollapsed}
          onToggleCollapse={() => setFiltersCollapsed((value) => !value)}
        />
      }
      main={
        <>
          <PanelHeader
            title="Live Valuations"
            description="SSE /valuation-stream — fair value, PnL, book α/β"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void seedSnapshot()}
                  disabled={loading}
                >
                  {loading ? "Loading…" : "Refresh"}
                </Button>
                <StatusPill
                  tone={tone}
                  title={`Valuation stream: ${streamStatus}`}
                >
                  {label}
                </StatusPill>
              </>
            }
          />

          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void seedSnapshot()}
            />
          ) : null}

          <PricingSummaryBar
            updates={updates}
            liveCount={liveCount}
            staleCount={staleCount}
            sumUnrealized={sumUnrealized}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading valuations…
              </div>
            ) : (
              <ValuationsTable
                rows={sortedRows}
                selectedTradeId={selectedTradeId}
                nowMs={nowMs}
                sort={sort}
                onSortChange={handleSortChange}
                onSelectRow={setSelectedTradeId}
                emptyMessage={
                  rows.length === 0
                    ? "Waiting for valuation stream…"
                    : "No valuations match the current filters."
                }
              />
            )}
          </div>
        </>
      }
      drawer={
        <PricingDrawer
          row={selectedRow}
          status={selectedStatusTone}
          insights={insights}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
