/**
 * One provider's quote for a symbol from market-data-service-integration —
 * either a "quote" SSE event off GET /market-data/stream (the normalized
 * payload a provider returned, see providers/quota_providers/*.py
 * normalize_data) or a row off GET /market-data/quotes (the same shape,
 * read back from the last-persisted value in Postgres). Same fields either
 * way, so one type covers both.
 */
export interface ProviderQuoteEvent {
  provider: string;
  asset_class: string;
  symbol: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  currency: string | null;
  provider_timestamp: string | null;
  received_at: string;
}

export interface ProviderQuotesResponse {
  quotes: ProviderQuoteEvent[];
}

