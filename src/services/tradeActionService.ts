import { apiClient } from "@/services/apiClient";
import { endpoints } from "@/services/endpoints";
import type {
  OpenTradeActionPayload,
  SubmitTradeActionResponse,
  TradeActionHealth,
  TradeActionStatus,
} from "@/services/tradeActionTypes";

export async function fetchTradeActionHealth(): Promise<TradeActionHealth> {
  return apiClient.get<TradeActionHealth>(endpoints.tradeAction.health);
}

export async function fetchTradeActionStatus(): Promise<TradeActionStatus> {
  return apiClient.get<TradeActionStatus>(endpoints.tradeAction.status);
}

export async function submitTradeAction(
  payload: OpenTradeActionPayload,
): Promise<SubmitTradeActionResponse> {
  return apiClient.post<SubmitTradeActionResponse>(
    endpoints.tradeAction.tradeActions,
    payload,
  );
}
