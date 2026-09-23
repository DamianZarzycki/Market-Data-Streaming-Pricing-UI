import { useCallback, useEffect, useState } from "react";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { useDensity } from "@/layout/DensityContext";
import {
  collapsedForDensity,
  useCompactLayout,
} from "@/layout/useCompactLayout";
import { ApiError } from "@/services/apiClient";
import { listBooks } from "@/services/booksService";
import type { OpenTradeActionPayload } from "@/services/tradeActionTypes";
import {
  fetchTradeGenerationConfig,
  fetchTradeGenerationHealth,
  fetchTradeGenerationStatus,
  generateBatch,
  generateOnce,
  generateTrade,
  startTradeGeneration,
  stopTradeGeneration,
  updateTradeGenerationConfig,
} from "@/services/tradeGenerationService";
import type {
  LastApiResponse,
  TradeGenerationConfig,
  TradeGenerationStatus,
} from "@/services/tradeGenerationTypes";
import type { Book } from "@/domain/types";
import {
  ConfigConfirmModal,
  type ConfigConfirmPending,
} from "@/views/TradeGenerationView/ConfigConfirmModal";
import { GenerateTradeModal } from "@/views/TradeGenerationView/GenerateTradeModal";
import { TradeGenerationControlPanel } from "@/views/TradeGenerationView/TradeGenerationControlPanel";
import { TradeGenerationDrawer } from "@/views/TradeGenerationView/TradeGenerationDrawer";
import { TradeGenerationStatusBar } from "@/views/TradeGenerationView/TradeGenerationStatusBar";

const STATUS_POLL_MS = 2000;

function formatClock(date = new Date()): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function errorPayload(err: unknown): unknown {
  if (err instanceof ApiError) {
    return err.body ?? { message: err.message, status: err.status };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Unknown error" };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}

export function TradeGenerationView() {
  const density = useDensity();
  const [status, setStatus] = useState<TradeGenerationStatus | null>(null);
  const [config, setConfig] = useState<TradeGenerationConfig | null>(null);
  const [serviceUp, setServiceUp] = useState<boolean | null>(null);
  const [lastResponse, setLastResponse] = useState<LastApiResponse | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [pendingConfig, setPendingConfig] =
    useState<ConfigConfirmPending | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [generateTradeOpen, setGenerateTradeOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [generateTradeError, setGenerateTradeError] = useState<string | null>(
    null,
  );
  const [drawerCollapsed, setDrawerCollapsed] = useState(() =>
    collapsedForDensity(density),
  );
  useCompactLayout({ setDrawerCollapsed });

  const recordResponse = useCallback(
    (method: string, path: string, ok: boolean, body: unknown) => {
      setLastResponse({
        method,
        path,
        at: formatClock(),
        ok,
        body,
      });
    },
    [],
  );

  const refreshStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [nextStatus, health] = await Promise.all([
        fetchTradeGenerationStatus(),
        fetchTradeGenerationHealth().catch(() => null),
      ]);
      setStatus(nextStatus);
      setServiceUp(health?.status?.toUpperCase() === "UP");
      setError(null);
    } catch (err) {
      setServiceUp(false);
      setError(errorMessage(err, "Failed to load generator status"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [nextStatus, health, nextConfig] = await Promise.all([
        fetchTradeGenerationStatus(),
        fetchTradeGenerationHealth().catch(() => null),
        fetchTradeGenerationConfig(),
      ]);
      setStatus(nextStatus);
      setServiceUp(health?.status?.toUpperCase() === "UP");
      setConfig(nextConfig);
      setError(null);
    } catch (err) {
      setServiceUp(false);
      setError(errorMessage(err, "Failed to load generator status"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll(true);
  }, [refreshAll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshStatus(false);
    }, STATUS_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshStatus]);

  const runAction = useCallback(
    async (
      busyKey: string,
      method: string,
      path: string,
      action: () => Promise<unknown>,
    ) => {
      setActionBusy(busyKey);
      setError(null);
      try {
        const body = await action();
        recordResponse(method, path, true, body);
        await refreshStatus(false);
      } catch (err) {
        recordResponse(method, path, false, errorPayload(err));
        setError(errorMessage(err, `Failed: ${method} ${path}`));
      } finally {
        setActionBusy(null);
      }
    },
    [recordResponse, refreshStatus],
  );

  const confirmConfigUpdate = useCallback(async () => {
    if (!pendingConfig) return;
    setActionBusy("config");
    setConfigError(null);
    setError(null);
    try {
      const body = await updateTradeGenerationConfig(pendingConfig.patch);
      recordResponse("PUT", "/config", true, body);
      setConfig(body.config);
      setPendingConfig(null);
      await refreshStatus(false);
    } catch (err) {
      recordResponse("PUT", "/config", false, errorPayload(err));
      setConfigError(errorMessage(err, "Failed to update config"));
    } finally {
      setActionBusy(null);
    }
  }, [pendingConfig, recordResponse, refreshStatus]);

  const openGenerateTrade = useCallback(async () => {
    setGenerateTradeError(null);
    setGenerateTradeOpen(true);
    try {
      setBooks(await listBooks());
    } catch (err) {
      setGenerateTradeError(errorMessage(err, "Failed to load books"));
    }
  }, []);

  const submitGenerateTrade = useCallback(
    async (payload: OpenTradeActionPayload) => {
      setActionBusy("trade-ticket");
      setGenerateTradeError(null);
      try {
        const body = await generateTrade(payload);
        recordResponse("POST", "/generate-trade", true, body);
        setGenerateTradeOpen(false);
        await refreshStatus(false);
      } catch (err) {
        recordResponse("POST", "/generate-trade", false, errorPayload(err));
        setGenerateTradeError(
          errorMessage(err, "Failed to generate trade"),
        );
      } finally {
        setActionBusy(null);
      }
    },
    [recordResponse, refreshStatus],
  );

  return (
    <WorkspaceLayout
      ariaLabel="Trade generation service"
      drawerCollapsed={drawerCollapsed}
      filters={
        <TradeGenerationStatusBar
          isRunning={status?.is_running ?? null}
          totalGenerated={status?.total_generated ?? null}
          intervalMs={config?.interval_ms ?? null}
          expectedRatePerSec={status?.expected_rate_per_sec ?? null}
          loading={loading}
          onRefresh={() => void refreshAll(true)}
        />
      }
      main={
        <>
          {error ? (
            <InlineAlert
              message={error}
              onRetry={() => void refreshAll(true)}
            />
          ) : null}
          <TradeGenerationControlPanel
            isRunning={status?.is_running ?? null}
            config={config}
            lastResponse={lastResponse}
            actionBusy={actionBusy}
            onStart={() =>
              void runAction("start", "POST", "/start", startTradeGeneration)
            }
            onStop={() =>
              void runAction("stop", "POST", "/stop", stopTradeGeneration)
            }
            onGenerateOnce={() =>
              void runAction("once", "GET", "/generate-once", generateOnce)
            }
            onGenerateBatch={() =>
              void runAction("batch", "GET", "/generate-batch", generateBatch)
            }
            onGenerateTrade={() => void openGenerateTrade()}
            onRequestConfigUpdate={(pending) => {
              setConfigError(null);
              setPendingConfig(pending);
            }}
          />
          {pendingConfig ? (
            <ConfigConfirmModal
              pending={pendingConfig}
              busy={actionBusy === "config"}
              error={configError}
              onClose={() => {
                if (actionBusy === "config") return;
                setPendingConfig(null);
                setConfigError(null);
              }}
              onConfirm={() => void confirmConfigUpdate()}
            />
          ) : null}
          {generateTradeOpen ? (
            <GenerateTradeModal
              books={books}
              busy={actionBusy === "trade-ticket"}
              error={generateTradeError}
              onClose={() => {
                if (actionBusy === "trade-ticket") return;
                setGenerateTradeOpen(false);
                setGenerateTradeError(null);
              }}
              onSubmit={(payload) => void submitGenerateTrade(payload)}
            />
          ) : null}
        </>
      }
      drawer={
        <TradeGenerationDrawer
          status={status}
          config={config}
          serviceUp={serviceUp}
          collapsed={drawerCollapsed}
          onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
        />
      }
    />
  );
}
