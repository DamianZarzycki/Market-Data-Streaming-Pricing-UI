import { useEffect, useRef, useState } from "react";
import {
  appendPriceHistoryBatch,
  mapTickDto,
  mergeTickRows,
} from "@/services/marketDataMappers";
import type {
  MarketDataTickDto,
  MarketTickRow,
  PricePoint,
} from "@/services/marketDataTypes";
import { endpoints } from "@/services/endpoints";
import { openSharedSseStream } from "@/services/sharedSseClient";
import type { SseStatus } from "@/services/sseClient";

const FLUSH_MS = 100;

export interface MarketDataBatch {
  rows: MarketTickRow[];
  ticksInBatch: number;
  /** Shared EventSource frame count; same value in every tab. */
  streamReceivedCount?: number;
}

/**
 * Subscribe to market-data-service /stream and coalesce ticks so
 * high-frequency updates do not re-render on every SSE frame.
 */
export function useMarketDataStream(
  onBatch: (batch: MarketDataBatch) => void,
  enabled = true,
): SseStatus {
  const [status, setStatus] = useState<SseStatus>("CONNECTING");
  const onBatchRef = useRef(onBatch);
  onBatchRef.current = onBatch;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pending: MarketTickRow[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let streamReceivedCount: number | undefined;

    const flush = () => {
      flushTimer = null;
      if (pending.length === 0) return;
      const rows = pending.splice(0, pending.length);
      onBatchRef.current({
        rows,
        ticksInBatch: rows.length,
        streamReceivedCount,
      });
    };

    const scheduleFlush = () => {
      if (flushTimer != null) return;
      flushTimer = setTimeout(flush, FLUSH_MS);
    };

    setStatus("CONNECTING");

    const dispose = openSharedSseStream<MarketDataTickDto>(
      endpoints.marketData.stream,
      {
        onStatusChange: setStatus,
        onReceivedCount: (count) => {
          const seeded = streamReceivedCount == null;
          streamReceivedCount = count;
          if (seeded) {
            onBatchRef.current({
              rows: [],
              ticksInBatch: 0,
              streamReceivedCount: count,
            });
          }
        },
        onMessage: (data) => {
          if (!data || typeof data !== "object") return;
          pending.push(mapTickDto(data));
          scheduleFlush();
        },
      },
    );

    return () => {
      if (flushTimer != null) clearTimeout(flushTimer);
      dispose();
    };
  }, [enabled]);

  return status;
}

/** Apply a flushed batch into table + price-history state helpers. */
export function applyMarketDataBatch(
  currentRows: MarketTickRow[],
  history: Map<string, PricePoint[]>,
  batch: MarketDataBatch,
): { rows: MarketTickRow[]; history: Map<string, PricePoint[]> } {
  return {
    rows: mergeTickRows(currentRows, batch.rows),
    history: appendPriceHistoryBatch(history, batch.rows),
  };
}
