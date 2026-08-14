import { useEffect, useRef, useState } from "react";
import { openSharedSseStream } from "@/services/sharedSseClient";
import type { SseStatus } from "@/services/sseClient";
import type { BlotterValuationDto } from "@/services/blotterTypes";
import { endpoints } from "@/services/endpoints";

const FLUSH_MS = 100;

/**
 * Subscribe to pricing-service /valuation-stream and coalesce updates by
 * trade_id so high-frequency ticks do not re-render on every event.
 */
export function useBlotterLiveValuations(
  onBatch: (updates: Map<string, BlotterValuationDto>) => void,
  enabled = true,
): SseStatus {
  const [status, setStatus] = useState<SseStatus>("CONNECTING");
  const onBatchRef = useRef(onBatch);
  onBatchRef.current = onBatch;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const pending = new Map<string, BlotterValuationDto>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      flushTimer = null;
      if (pending.size === 0) return;
      const batch = new Map(pending);
      pending.clear();
      onBatchRef.current(batch);
    };

    const scheduleFlush = () => {
      if (flushTimer != null) return;
      flushTimer = setTimeout(flush, FLUSH_MS);
    };

    setStatus("CONNECTING");

    const dispose = openSharedSseStream<BlotterValuationDto>(
      endpoints.pricing.valuationStream,
      {
        eventName: "valuation_update",
        onStatusChange: setStatus,
        onMessage: (data) => {
          const tradeId = data.trade_id;
          if (!tradeId) return;
          pending.set(String(tradeId), data);
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
