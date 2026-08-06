const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const services = {
  marketData: `${API_BASE}/market-data`,
  pricing: `${API_BASE}/pricing`,
  monitoring: `${API_BASE}/monitoring`,
  books: `${API_BASE}/books`,
  blotter: `${API_BASE}/blotter`,
  tradeGeneration: `${API_BASE}/trade-generation`,
  tradeAction: `${API_BASE}/trade-action`,
} as const;

export const endpoints = {
  marketData: {
    stream: `${services.marketData}/stream`,
    snapshot: `${services.marketData}/snapshot`,
    symbols: `${services.marketData}/symbols`,
    health: `${services.marketData}/health`,
  },
  pricing: {
    valuationStream: `${services.pricing}/valuation-stream`,
    valuations: `${services.pricing}/valuations`,
    valuationByTrade: (tradeId: string) =>
      `${services.pricing}/valuations/${tradeId}`,
    health: `${services.pricing}/health`,
  },
  monitoring: {
    status: `${services.monitoring}/status`,
    statusStream: `${services.monitoring}/status-stream`,
  },
  books: {
    list: `${services.books}/books`,
    byId: (bookId: string) => `${services.books}/books/${bookId}`,
    create: `${services.books}/books`,
    update: (bookId: string) => `${services.books}/books/${bookId}`,
    remove: (bookId: string) => `${services.books}/books/${bookId}`,
  },
  blotter: {
    booksSummary: `${services.blotter}/books/summary`,
    /** @deprecated Use booksSummary — backend path is /books/summary */
    booksPnl: `${services.blotter}/books/summary`,
    trades: `${services.blotter}/trades`,
    tradeById: (tradeId: string) => `${services.blotter}/trades/${tradeId}`,
    tradeValuations: (tradeId: string) =>
      `${services.blotter}/trades/${tradeId}/valuations`,
    tradeAuditLogs: (tradeId: string) =>
      `${services.blotter}/trades/${tradeId}/audit-logs`,
  },
  tradeGeneration: {
    health: `${services.tradeGeneration}/health`,
    status: `${services.tradeGeneration}/status`,
    start: `${services.tradeGeneration}/start`,
    stop: `${services.tradeGeneration}/stop`,
    generateOnce: `${services.tradeGeneration}/generate-once`,
    generateBatch: `${services.tradeGeneration}/generate-batch`,
  },
  tradeAction: {
    health: `${services.tradeAction}/health`,
    status: `${services.tradeAction}/status`,
    tradeActions: `${services.tradeAction}/trade-actions`,
    tradeActionsBatch: `${services.tradeAction}/trade-actions/batch`,
  },
} as const;
