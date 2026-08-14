import { useEffect, useRef, useState } from "react";
import { openSharedSseStream } from "@/services/sharedSseClient";
import type { SseStatus } from "@/services/sseClient";
import { endpoints } from "@/services/endpoints";
import type { PricingValuationDto } from "@/services/pricingTypes";

const FLUSH_MS = 100;

export interface PricingValuationBatch {
  /** Latest valuation per trade_id in this flush window. */
  updates: Map<string, PricingValuationDto>;
  /** Raw event count in the flush (for UPDATES KPI when not shared). */
  eventsInBatch: number;
  /** Shared EventSource frame count; same value in every tab. */
  streamReceivedCount?: number;
}

/**
 * Subscribe to pricing-service /valuation-stream and coalesce updates by
 * trade_id so high-frequency ticks do not re-render on every event.
 */
export function usePricingValuationStream(
  onBatch: (batch: PricingValuationBatch) => void,
  enabled = true,
): SseStatus {
  const [status, setStatus] = useState<SseStatus>("CONNECTING");
  const onBatchRef = useRef(onBatch);
  onBatchRef.current = onBatch;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pending = new Map<string, PricingValuationDto>();
    let eventsInBatch = 0;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    let streamReceivedCount: number | undefined;

    const flush = () => {
      flushTimer = null;
      if (pending.size === 0) return;
      const batch: PricingValuationBatch = {
        updates: new Map(pending),
        eventsInBatch,
        streamReceivedCount,
      };
      pending.clear();
      eventsInBatch = 0;
      onBatchRef.current(batch);
    };

    const scheduleFlush = () => {
      if (flushTimer != null) return;
      flushTimer = setTimeout(flush, FLUSH_MS);
    };

    setStatus("CONNECTING");

    const dispose = openSharedSseStream<PricingValuationDto>(
      endpoints.pricing.valuationStream,
      {
        eventName: "valuation_update",
        onStatusChange: setStatus,
        onReceivedCount: (count) => {
          const seeded = streamReceivedCount == null;
          streamReceivedCount = count;
          if (seeded) {
            onBatchRef.current({
              updates: new Map(),
              eventsInBatch: 0,
              streamReceivedCount: count,
            });
          }
        },
        onMessage: (data) => {
          const tradeId = data?.trade_id;
          if (!tradeId) return;
          pending.set(String(tradeId), data);
          eventsInBatch += 1;
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
