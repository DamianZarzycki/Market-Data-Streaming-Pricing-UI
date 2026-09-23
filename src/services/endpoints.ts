const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const services = {
  marketData: `${API_BASE}/market-data`,
  pricing: `${API_BASE}/pricing`,
  monitoring: `${API_BASE}/monitoring`,
  books: `${API_BASE}/books`,
  blotter: `${API_BASE}/blotter`,
  tradeGeneration: `${API_BASE}/trade-generation`,
  tradeAction: `${API_BASE}/trade-action`,
  providerQuotes: `${API_BASE}/provider-quotes`,
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
    bookMetrics: `${services.pricing}/book-metrics`,
    bookMetricsById: (bookId: string) =>
      `${services.pricing}/book-metrics/${bookId}`,
    health: `${services.pricing}/health`,
  },
  monitoring: {
    health: `${services.monitoring}/health`,
    status: `${services.monitoring}/status`,
    /** Reserved — not implemented by BE today. Do not call from UI. */
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
    config: `${services.tradeGeneration}/config`,
    start: `${services.tradeGeneration}/start`,
    stop: `${services.tradeGeneration}/stop`,
    generateOnce: `${services.tradeGeneration}/generate-once`,
    generateBatch: `${services.tradeGeneration}/generate-batch`,
    generateTrade: `${services.tradeGeneration}/generate-trade`,
  },
  tradeAction: {
    health: `${services.tradeAction}/health`,
    status: `${services.tradeAction}/status`,
    tradeActions: `${services.tradeAction}/trade-actions`,
    tradeActionsBatch: `${services.tradeAction}/trade-actions/batch`,
  },
  providerQuotes: {
    /** market-data-service-integration: SSE, "quote" events for equity symbols only. */
    stream: `${services.providerQuotes}/market-data/stream`,
    /** Latest persisted quote per provider and symbol. */
    snapshot: `${services.providerQuotes}/market-data/snapshot`,
    /** Symbols per asset class from the integration service env. */
    symbols: `${services.providerQuotes}/market-data/symbols`,
    /** market-data-service-integration: GET /market-data/quotes?symbol=&asset_class= — last persisted value per provider. */
    quotes: (symbol: string, assetClass: string) =>
      `${services.providerQuotes}/market-data/quotes?symbol=${encodeURIComponent(symbol)}&asset_class=${encodeURIComponent(assetClass)}`,
    /** FX spot from the persisted NBP table. Not an SSE stream. */
    fxQuotes: (symbol: string) =>
      `${services.providerQuotes}/market-data/fx-quotes?symbol=${encodeURIComponent(symbol)}`,
    /** Bond or IRS yield from the persisted FRED/ECB curve. Not an SSE stream. */
    curveQuotes: (symbol: string, assetClass: string) =>
      `${services.providerQuotes}/market-data/curve-quotes?symbol=${encodeURIComponent(symbol)}&asset_class=${encodeURIComponent(assetClass)}`,
  },
} as const;
