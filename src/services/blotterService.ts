import type { AuditLog, Book, Trade, Valuation } from "@/domain/types";
import { apiClient } from "@/services/apiClient";
import {
  bookNameLookup,
  mapAuditLogDto,
  mapBookDto,
  mapTradeDto,
  mapValuationDto,
} from "@/services/blotterMappers";
import { endpoints } from "@/services/endpoints";
import type {
  BlotterBooksSummaryResponse,
  BlotterTradeDetailResponse,
  BlotterTradesResponse,
  BlotterValuationsResponse,
  FetchTradesParams,
} from "@/services/blotterTypes";

function buildTradesUrl(params?: FetchTradesParams): string {
  if (!params) return endpoints.blotter.trades;
  const search = new URLSearchParams();
  if (params.book_id) search.set("book_id", params.book_id);
  if (params.asset_class) search.set("asset_class", params.asset_class);
  if (params.status) search.set("status", params.status);
  if (params.symbol) search.set("symbol", params.symbol);
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  const query = search.toString();
  return query
    ? `${endpoints.blotter.trades}?${query}`
    : endpoints.blotter.trades;
}

export async function fetchBooks(): Promise<Book[]> {
  const data = await apiClient.get<BlotterBooksSummaryResponse>(
    endpoints.blotter.booksSummary,
  );
  return (data.books ?? []).map(mapBookDto);
}

export async function fetchTrades(
  params?: FetchTradesParams,
  bookNameById?: Record<string, string>,
): Promise<Trade[]> {
  const data = await apiClient.get<BlotterTradesResponse>(
    buildTradesUrl(params),
  );
  return (data.trades ?? []).map((dto) =>
    mapTradeDto(dto, { bookNameById }),
  );
}

export async function fetchTradeDetail(
  tradeId: string,
  bookNameById?: Record<string, string>,
): Promise<{
  trade: Trade;
  valuationHistory: Valuation[];
  auditLogs: AuditLog[];
}> {
  const data = await apiClient.get<BlotterTradeDetailResponse>(
    endpoints.blotter.tradeById(tradeId),
  );

  const trade = mapTradeDto(data.trade, {
    bookNameById,
    latestValuation: data.latest_valuation,
  });

  const historySource =
    data.valuation_history?.length > 0
      ? data.valuation_history
      : data.latest_valuation
        ? [data.latest_valuation]
        : [];

  // Newest-first from API; keep drawer light even if history grows.
  const valuationHistory = historySource
    .slice(0, 20)
    .map((dto) =>
      mapValuationDto(dto, {
        status: data.latest_valuation ? "LIVE" : "STALE",
      }),
    );

  const auditLogs = (data.audit_logs ?? []).map(mapAuditLogDto);

  return { trade, valuationHistory, auditLogs };
}

export async function fetchTradeValuations(
  tradeId: string,
): Promise<Valuation[]> {
  const data = await apiClient.get<BlotterValuationsResponse>(
    endpoints.blotter.tradeValuations(tradeId),
  );
  return (data.valuations ?? []).map((dto) =>
    mapValuationDto(dto, { status: "STALE" }),
  );
}

const DEFAULT_PAGE_SIZE = 50;

/** Load books + trades and attach book names in one call. */
export async function fetchBlotterSnapshot(params?: FetchTradesParams): Promise<{
  books: Book[];
  trades: Trade[];
  bookNameById: Record<string, string>;
}> {
  const tradeParams: FetchTradesParams = {
    limit: DEFAULT_PAGE_SIZE,
    page: 1,
    ...params,
  };
  const [books, tradesResponse] = await Promise.all([
    fetchBooks(),
    apiClient.get<BlotterTradesResponse>(buildTradesUrl(tradeParams)),
  ]);
  const bookNameById = bookNameLookup(books);
  const trades = (tradesResponse.trades ?? []).map((dto) =>
    mapTradeDto(dto, { bookNameById }),
  );
  return { books, trades, bookNameById };
}

export const blotterService = {
  fetchBooks,
  fetchTrades,
  fetchTradeDetail,
  fetchTradeValuations,
  fetchBlotterSnapshot,
};
