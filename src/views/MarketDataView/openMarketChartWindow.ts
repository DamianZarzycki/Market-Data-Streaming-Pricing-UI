import type { PricePoint } from "@/services/marketDataTypes";
import {
  CHART_POPOUT_SOURCE,
  isChartReadyMessage,
  type ChartPopoutMeta,
} from "@/views/MarketDataView/chartPopoutProtocol";

export const MAX_CHART_POPOUTS = 50;

const POPUP_WIDTH = 480;
const POPUP_HEIGHT = 280;
const CASCADE_STEP = 24;

let openWindows: Window[] = [];
let nextId = 0;
let cascadeIndex = 0;

export type OpenChartWindowResult =
  | { ok: true }
  | { ok: false; reason: "limit" | "blocked" };

function livingWindows(): Window[] {
  openWindows = openWindows.filter((win) => !win.closed);
  return openWindows;
}

export function openMarketChartWindow(
  meta: ChartPopoutMeta,
  points: PricePoint[],
): OpenChartWindowResult {
  if (livingWindows().length >= MAX_CHART_POPOUTS) {
    return { ok: false, reason: "limit" };
  }

  const url = new URL("/popout/market-chart", window.location.origin);
  url.searchParams.set("instrument", meta.instrumentKey);
  if (meta.currency) url.searchParams.set("currency", meta.currency);
  if (meta.dataClass) url.searchParams.set("dataClass", meta.dataClass);
  if (meta.source) url.searchParams.set("source", meta.source);

  const offset = (cascadeIndex % MAX_CHART_POPOUTS) * CASCADE_STEP;
  cascadeIndex += 1;
  const left = Math.max(0, window.screenX + 80 + offset);
  const top = Math.max(0, window.screenY + 80 + offset);
  const name = `md-chart-${++nextId}`;
  const features = [
    "popup=yes",
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${left}`,
    `top=${top}`,
  ].join(",");

  const popup = window.open(url.toString(), name, features);
  if (!popup) {
    return { ok: false, reason: "blocked" };
  }

  openWindows.push(popup);
  const seed = points.map((point) => ({ ...point }));
  const origin = window.location.origin;

  const onMessage = (event: MessageEvent) => {
    if (event.origin !== origin) return;
    if (event.source !== popup) return;
    if (!isChartReadyMessage(event.data)) return;
    popup.postMessage(
      { source: CHART_POPOUT_SOURCE, type: "chart-seed", points: seed },
      origin,
    );
    window.removeEventListener("message", onMessage);
  };

  window.addEventListener("message", onMessage);
  window.setTimeout(() => {
    window.removeEventListener("message", onMessage);
  }, 10_000);

  return { ok: true };
}
