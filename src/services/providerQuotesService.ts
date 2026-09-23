import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import { mapProviderQuote } from "@/services/marketDataMappers";
import type { MarketTickRow } from "@/services/marketDataTypes";
import type {
  ProviderQuoteEvent,
  ProviderQuotesResponse,
} from "@/services/providerQuotesTypes";

export interface FuturesContractSpec {
  underlying: string;
  multiplier: number;
}

export interface SymbolMap {
  EQUITY: string[];
  FX: string[];
  BOND: string[];
  IRS: string[];
  FUTURES: string[];
  FUTURES_CONTRACTS: Record<string, FuturesContractSpec>;
}

/** Last-persisted quote per provider for a symbol — used to seed the
 * comparison table instantly when it opens, ahead of the next SSE tick. */
export async function fetchProviderQuotes(
  symbol: string,
  assetClass: string,
): Promise<ProviderQuoteEvent[]> {
  const data = await apiClient.get<ProviderQuotesResponse>(
    endpoints.providerQuotes.quotes(symbol, assetClass),
  );
  return data.quotes ?? [];
}

export async function fetchProviderQuoteSnapshot(): Promise<MarketTickRow[]> {
  const data = await apiClient.get<{ snapshot?: ProviderQuoteEvent[] }>(
    endpoints.providerQuotes.snapshot,
  );
  const receivedAt = Date.now();
  return (data.snapshot ?? []).map((quote) =>
    mapProviderQuote(quote, receivedAt),
  );
}

export async function fetchSymbolMap(): Promise<SymbolMap> {
  const data = await apiClient.get<Partial<SymbolMap>>(
    endpoints.providerQuotes.symbols,
  );
  return {
    EQUITY: data.EQUITY ?? [],
    FX: data.FX ?? [],
    BOND: data.BOND ?? [],
    IRS: data.IRS ?? [],
    FUTURES: data.FUTURES ?? [],
    FUTURES_CONTRACTS: data.FUTURES_CONTRACTS ?? {},
  };
}

/** NBP cross for an FX pair. ECB and FRED are not spots, so they are absent. */
export async function fetchFxQuotes(
  symbol: string,
): Promise<ProviderQuoteEvent[]> {
  const data = await apiClient.get<ProviderQuotesResponse>(
    endpoints.providerQuotes.fxQuotes(symbol),
  );
  return data.quotes ?? [];
}

/** FRED or ECB tenor for a bond or IRS symbol. The other provider is absent. */
export async function fetchCurveQuotes(
  symbol: string,
  assetClass: string,
): Promise<ProviderQuoteEvent[]> {
  const data = await apiClient.get<ProviderQuotesResponse>(
    endpoints.providerQuotes.curveQuotes(symbol, assetClass),
  );
  return data.quotes ?? [];
}
