import type { MarketDataClass, PricePoint } from "@/services/marketDataTypes";

export const CHART_POPOUT_SOURCE = "trading-market-chart";

export type ChartReadyMessage = {
  source: typeof CHART_POPOUT_SOURCE;
  type: "chart-ready";
};

export type ChartSeedMessage = {
  source: typeof CHART_POPOUT_SOURCE;
  type: "chart-seed";
  points: PricePoint[];
};

export function isChartReadyMessage(data: unknown): data is ChartReadyMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as ChartReadyMessage;
  return msg.source === CHART_POPOUT_SOURCE && msg.type === "chart-ready";
}

export function isChartSeedMessage(data: unknown): data is ChartSeedMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as ChartSeedMessage;
  return (
    msg.source === CHART_POPOUT_SOURCE &&
    msg.type === "chart-seed" &&
    Array.isArray(msg.points)
  );
}

export interface ChartPopoutMeta {
  instrumentKey: string;
  currency?: string | null;
  dataClass?: MarketDataClass | null;
  source?: "simulator" | "provider";
}
