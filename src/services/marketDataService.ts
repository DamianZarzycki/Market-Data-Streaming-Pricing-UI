import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import { mapSnapshotDto } from "@/services/marketDataMappers";
import type {
  MarketDataSnapshotDto,
  MarketTickRow,
} from "@/services/marketDataTypes";

export async function fetchMarketDataSnapshot(): Promise<MarketTickRow[]> {
  const snapshot = await apiClient.get<MarketDataSnapshotDto>(
    endpoints.marketData.snapshot,
  );
  return mapSnapshotDto(snapshot ?? {});
}
