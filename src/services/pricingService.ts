import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import {
  mapSnapshotDto,
  type BookNameLookup,
} from "@/services/pricingMappers";
import type {
  PricingBookMetricsDto,
  PricingBookMetricsResponse,
  PricingHealthDto,
  PricingValuationRow,
  PricingValuationsSnapshotDto,
} from "@/services/pricingTypes";

export async function fetchPricingValuations(
  bookNames: BookNameLookup = {},
  metricsByBook: Record<string, PricingBookMetricsDto> = {},
): Promise<PricingValuationRow[]> {
  const snapshot = await apiClient.get<PricingValuationsSnapshotDto>(
    endpoints.pricing.valuations,
  );
  return mapSnapshotDto(snapshot ?? {}, bookNames, metricsByBook);
}

export async function fetchBookMetrics(): Promise<
  Record<string, PricingBookMetricsDto>
> {
  try {
    const data = await apiClient.get<PricingBookMetricsResponse>(
      endpoints.pricing.bookMetrics,
    );
    return data.books ?? {};
  } catch {
    return {};
  }
}

export async function fetchPricingHealth(): Promise<PricingHealthDto> {
  return apiClient.get<PricingHealthDto>(endpoints.pricing.health);
}
