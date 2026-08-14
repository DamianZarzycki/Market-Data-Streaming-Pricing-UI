import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import type {
  TradeGenerationConfig,
  TradeGenerationConfigPatch,
  TradeGenerationConfigUpdateResponse,
  TradeGenerationHealth,
  TradeGenerationStatus,
} from "@/services/tradeGenerationTypes";

export async function fetchTradeGenerationStatus(): Promise<TradeGenerationStatus> {
  return apiClient.get<TradeGenerationStatus>(endpoints.tradeGeneration.status);
}

export async function fetchTradeGenerationHealth(): Promise<TradeGenerationHealth> {
  return apiClient.get<TradeGenerationHealth>(endpoints.tradeGeneration.health);
}

export async function fetchTradeGenerationConfig(): Promise<TradeGenerationConfig> {
  return apiClient.get<TradeGenerationConfig>(endpoints.tradeGeneration.config);
}

export async function updateTradeGenerationConfig(
  patch: TradeGenerationConfigPatch,
): Promise<TradeGenerationConfigUpdateResponse> {
  return apiClient.put<TradeGenerationConfigUpdateResponse>(
    endpoints.tradeGeneration.config,
    patch,
  );
}

export async function startTradeGeneration(): Promise<unknown> {
  return apiClient.post(endpoints.tradeGeneration.start);
}

export async function stopTradeGeneration(): Promise<unknown> {
  return apiClient.post(endpoints.tradeGeneration.stop);
}

export async function generateOnce(): Promise<unknown> {
  return apiClient.get(endpoints.tradeGeneration.generateOnce);
}

export async function generateBatch(): Promise<unknown> {
  return apiClient.get(endpoints.tradeGeneration.generateBatch);
}
