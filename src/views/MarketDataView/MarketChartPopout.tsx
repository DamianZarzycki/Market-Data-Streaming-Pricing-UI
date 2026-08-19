import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMarketDataStream, type MarketDataBatch } from "@/hooks/useMarketDataStream";
import { appendPriceHistoryBatch } from "@/services/marketDataMappers";
import type { MarketDataClass, PricePoint } from "@/services/marketDataTypes";
import { registerWorkerRole } from "@/services/sharedWorkerRole";
import {
  CHART_POPOUT_SOURCE,
  isChartSeedMessage,
} from "@/views/MarketDataView/chartPopoutProtocol";
import {
  formatPrice,
  isRateQuoted,
} from "@/views/MarketDataView/formatters";
import { PriceSparkline } from "@/views/MarketDataView/PriceSparkline";

export function MarketChartPopout() {
  const [params] = useSearchParams();
  const instrumentKey = params.get("instrument") ?? "";
  const currency = params.get("currency") || null;
  const dataClass = (params.get("dataClass") || null) as MarketDataClass | null;

  const [points, setPoints] = useState<PricePoint[]>([]);

  useEffect(() => {
    document.title = instrumentKey
      ? `${instrumentKey} · Market chart`
      : "Market chart";
  }, [instrumentKey]);

  useEffect(() => {
    return registerWorkerRole("chart", () => {
      window.close();
    });
  }, []);

  useEffect(() => {
    const opener = window.opener as Window | null;
    if (!opener || opener.closed) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== opener) return;
      if (!isChartSeedMessage(event.data)) return;
      const seed = event.data.points;
      setPoints((current) => mergeSeed(seed, current));
    };

    window.addEventListener("message", onMessage);
    opener.postMessage(
      { source: CHART_POPOUT_SOURCE, type: "chart-ready" },
      window.location.origin,
    );

    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handleBatch = useCallback(
    (batch: MarketDataBatch) => {
      if (!instrumentKey) return;
      const rows = batch.rows.filter(
        (row) => row.instrumentKey === instrumentKey,
      );
      if (rows.length === 0) return;
      setPoints((current) => {
        const history = new Map<string, PricePoint[]>([
          [instrumentKey, current],
        ]);
        return (
          appendPriceHistoryBatch(history, rows).get(instrumentKey) ?? current
        );
      });
    },
    [instrumentKey],
  );

  useMarketDataStream(handleBatch, Boolean(instrumentKey));

  const last = points[points.length - 1];
  const lastPrice = useMemo(
    () => formatPrice(last?.price ?? null, currency, 4, dataClass),
    [last?.price, currency, dataClass],
  );

  if (!instrumentKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface text-sm text-text-muted">
        Missing instrument.
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-surface text-text">
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{instrumentKey}</h1>
          <p className="text-sm text-text-muted">
            {dataClass ?? "UNKNOWN"}
            {isRateQuoted(dataClass) ? " · rate" : ""}
          </p>
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums">{lastPrice}</span>
      </header>
      <div className="min-h-0 flex-1 p-2">
        <PriceSparkline
          points={points}
          instrumentKey={instrumentKey}
          currency={currency}
          dataClass={dataClass}
          height={200}
        />
      </div>
    </div>
  );
}

/** Seed first, live ticks win on the same second. */
function mergeSeed(seed: PricePoint[], live: PricePoint[]): PricePoint[] {
  const byT = new Map<number, number>();
  for (const point of seed) {
    byT.set(point.t, point.price);
  }
  for (const point of live) {
    byT.set(point.t, point.price);
  }
  return [...byT.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, price]) => ({ t, price }));
}
