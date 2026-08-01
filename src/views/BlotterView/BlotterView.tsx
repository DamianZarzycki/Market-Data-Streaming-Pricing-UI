import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import type {
  AuditLog,
  Book,
  Trade,
  TradeStatus,
  Valuation,
} from "@/domain/types";
import { useBlotterLiveValuations } from "@/hooks/useBlotterLiveValuations";
import { streamLabel, streamTone } from "@/lib/streamStatus";
import { ApiError } from "@/services/apiClient";
import {
  applyLiveValuation,
  computePortfolioSummary,
  mapValuationDto,
} from "@/services/blotterMappers";
import {
  fetchBlotterSnapshot,
  fetchTradeDetail,
  fetchTrades,
} from "@/services/blotterService";
import type {
  BlotterValuationDto,
  FetchTradesParams,
} from "@/services/blotterTypes";
import {
  BlotterFilters,
  type AssetClassFilter,
  type BookFilter,
} from "@/views/BlotterView/BlotterFilters";
import { BlotterSummaryBar } from "@/views/BlotterView/BlotterSummaryBar";
import {
  TradeDrawer,
  type DrawerTab,
} from "@/views/BlotterView/TradeDrawer";
import { TradesTable } from "@/views/BlotterView/TradesTable";

const PAGE_SIZE = 50;
const MAX_LIVE_HISTORY = 20;

function buildFetchParams(
  selectedBookId: BookFilter,
  selectedAssetClass: AssetClassFilter,
  selectedStatus: TradeStatus | "ALL",
  page: number,
): FetchTradesParams {
  const params: FetchTradesParams = { page, limit: PAGE_SIZE };
  if (selectedBookId !== "ALL") {
    params.book_id = selectedBookId;
  }
  if (selectedAssetClass !== "ALL") {
    params.asset_class = selectedAssetClass;
  }
  if (selectedStatus !== "ALL") {
    params.status = selectedStatus;
  }
  return params;
}

export function BlotterView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [selectedBookId, setSelectedBookId] = useState<BookFilter>("ALL");
  const [selectedAssetClass, setSelectedAssetClass] =
    useState<AssetClassFilter>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<TradeStatus | "ALL">(
    "ALL",
  );
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("details");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);

  const [valuationHistory, setValuationHistory] = useState<Valuation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const bookNameByIdRef = useRef<Record<string, string>>({});
  const selectedTradeIdRef = useRef<string | null>(null);
  selectedTradeIdRef.current = selectedTradeId;

  const handleLiveValuations = useCallback(
    (updates: Map<string, BlotterValuationDto>) => {
      setTrades((current) => {
        let changed = false;
        const next = current.map((trade) => {
          const tick = updates.get(trade.trade_id);
          if (!tick) return trade;
          changed = true;
          return applyLiveValuation(trade, tick);
        });
        return changed ? next : current;
      });

      const selectedId = selectedTradeIdRef.current;
      if (!selectedId) return;
      const selectedTick = updates.get(selectedId);
      if (!selectedTick) return;

      const mapped = mapValuationDto(selectedTick, { status: "LIVE" });
      setValuationHistory((current) => {
        const deduped = current.filter(
          (item) => item.created_at !== mapped.created_at,
        );
        return [mapped, ...deduped].slice(0, MAX_LIVE_HISTORY);
      });
    },
    [],
  );

  const streamStatus = useBlotterLiveValuations(
    handleLiveValuations,
    !loading || trades.length > 0,
  );

  const loadTrades = useCallback(
    async (
      bookId: BookFilter,
      assetClass: AssetClassFilter,
      status: TradeStatus | "ALL",
      nextPage = 1,
    ) => {
      const isFirstPage = nextPage === 1;
      if (isFirstPage) {
        setLoading(true);
      } else {
        setPageLoading(true);
      }
      setError(null);
      try {
        const params = buildFetchParams(bookId, assetClass, status, nextPage);
        if (isFirstPage) {
          const snapshot = await fetchBlotterSnapshot(params);
          bookNameByIdRef.current = snapshot.bookNameById;
          setBooks(snapshot.books);
          setTrades(snapshot.trades);
          setPage(1);
          setHasMore(snapshot.trades.length >= PAGE_SIZE);
          setSelectedTradeId((current) =>
            current &&
            snapshot.trades.some((trade) => trade.trade_id === current)
              ? current
              : null,
          );
        } else {
          const pageTrades = await fetchTrades(
            params,
            bookNameByIdRef.current,
          );
          setTrades((current) => [...current, ...pageTrades]);
          setPage(nextPage);
          setHasMore(pageTrades.length >= PAGE_SIZE);
        }
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load blotter data";
        setError(message);
        if (isFirstPage) {
          setTrades([]);
          setBooks([]);
        }
      } finally {
        setLoading(false);
        setPageLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadTrades("ALL", "ALL", "ALL", 1);
  }, [loadTrades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const bookOk =
        selectedBookId === "ALL" || trade.book_id === selectedBookId;
      const assetOk =
        selectedAssetClass === "ALL" ||
        trade.asset_class === selectedAssetClass;
      const statusOk =
        selectedStatus === "ALL" || trade.status === selectedStatus;
      return bookOk && assetOk && statusOk;
    });
  }, [trades, selectedBookId, selectedAssetClass, selectedStatus]);

  const summary = useMemo(
    () => computePortfolioSummary(filteredTrades),
    [filteredTrades],
  );

  const selectedTrade: Trade | null = useMemo(() => {
    if (!selectedTradeId) return null;
    return (
      filteredTrades.find((t) => t.trade_id === selectedTradeId) ??
      trades.find((t) => t.trade_id === selectedTradeId) ??
      null
    );
  }, [filteredTrades, trades, selectedTradeId]);

  useEffect(() => {
    if (!selectedTradeId) {
      setValuationHistory([]);
      setAuditLogs([]);
      setDrawerError(null);
      return;
    }

    let cancelled = false;
    setDrawerLoading(true);
    setDrawerError(null);

    void fetchTradeDetail(selectedTradeId, bookNameByIdRef.current)
      .then((detail) => {
        if (cancelled) return;
        setValuationHistory(detail.valuationHistory);
        setAuditLogs(detail.auditLogs);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to load trade details";
        setDrawerError(message);
        setValuationHistory([]);
        setAuditLogs([]);
      })
      .finally(() => {
        if (!cancelled) setDrawerLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTradeId]);

  const handleSelectTrade = useCallback((tradeId: string) => {
    setSelectedTradeId(tradeId);
    setDrawerTab("details");
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedBookId("ALL");
    setSelectedAssetClass("ALL");
    setSelectedStatus("ALL");
    void loadTrades("ALL", "ALL", "ALL", 1);
  }, [loadTrades]);

  const handleRefresh = useCallback(() => {
    void loadTrades(selectedBookId, selectedAssetClass, selectedStatus, 1);
  }, [loadTrades, selectedBookId, selectedAssetClass, selectedStatus]);

  const handleLoadMore = useCallback(() => {
    void loadTrades(
      selectedBookId,
      selectedAssetClass,
      selectedStatus,
      page + 1,
    );
  }, [loadTrades, selectedBookId, selectedAssetClass, selectedStatus, page]);

  const tone = streamTone(streamStatus, Boolean(error), loading);
  const label = streamLabel(streamStatus, Boolean(error), loading);

  return (
    <WorkspaceLayout
      ariaLabel="Blotter service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <BlotterFilters
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
            title="Live Trades"
            description="Books, valuations, and PnL — live via pricing SSE"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={handleRefresh}
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
            <InlineAlert message={error} onRetry={handleRefresh} />
          ) : null}

          <BlotterSummaryBar
            summary={summary}
            tradeCount={filteredTrades.length}
          />

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && trades.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading trades…
              </div>
            ) : (
              <>
                <TradesTable
                  trades={filteredTrades}
                  selectedTradeId={selectedTradeId}
                  onSelectTrade={handleSelectTrade}
                  emptyMessage={
                    trades.length === 0
                      ? "No trades available from blotter-service."
                      : "No trades match the current filters."
                  }
                />
                {hasMore ? (
                  <div className="flex justify-center border-t border-border px-4 py-3">
                    <Button
                      variant="secondary"
                      onClick={handleLoadMore}
                      disabled={pageLoading || loading}
                    >
                      {pageLoading ? "Loading…" : "Load more trades"}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </>
      }
      drawer={
        <TradeDrawer
          trade={selectedTrade}
          activeTab={drawerTab}
          onTabChange={setDrawerTab}
          valuationHistory={valuationHistory}
          auditLogs={auditLogs}
          loading={drawerLoading}
          error={drawerError}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
