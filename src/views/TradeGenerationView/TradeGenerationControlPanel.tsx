import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PanelHeader } from "@/components/layout/PanelHeader";
import type { LastApiResponse } from "@/services/tradeGenerationTypes";

interface TradeGenerationControlPanelProps {
  isRunning: boolean | null;
  lastResponse: LastApiResponse | null;
  actionBusy: string | null;
  onStart: () => void;
  onStop: () => void;
  onGenerateOnce: () => void;
  onGenerateBatch: () => void;
}

export function TradeGenerationControlPanel({
  isRunning,
  lastResponse,
  actionBusy,
  onStart,
  onStop,
  onGenerateOnce,
  onGenerateBatch,
}: TradeGenerationControlPanelProps) {
  const running = Boolean(isRunning);
  const busy = actionBusy != null;

  return (
    <>
      <PanelHeader
        title="Control panel"
        description="Start / stop the worker and fire one-shot or batch generations via API"
        actions={
          isRunning != null ? (
            <StatusPill tone={running ? "live" : "stale"}>
              {running ? "RUNNING" : "STOPPED"}
            </StatusPill>
          ) : null
        }
      />

      <div className="scrollbar-none flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        <section aria-label="Continuous worker" className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">1. Continuous worker</h2>
          <p className="text-sm text-text-muted">
            POST /start · POST /stop · polled via GET /status
          </p>
          <div className="rounded border border-border bg-surface-alt p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                onClick={onStart}
                disabled={busy || running || isRunning == null}
              >
                {actionBusy === "start" ? "Starting…" : "Start generator"}
              </Button>
              <Button
                variant="danger"
                onClick={onStop}
                disabled={busy || !running}
              >
                {actionBusy === "stop" ? "Stopping…" : "Stop generator"}
              </Button>
              {isRunning != null ? (
                <StatusPill tone={running ? "live" : "stale"}>
                  is_running = {String(isRunning)}
                </StatusPill>
              ) : null}
            </div>
            <p className="mt-2.5 text-sm text-text-muted">
              Start is disabled while running (API returns 400). Stop sets
              is_running=false and ends the worker loop.
            </p>
          </div>
        </section>

        <section aria-label="Manual generation" className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">2. Manual generation</h2>
          <p className="text-sm text-text-muted">
            GET /generate-once · GET /generate-batch (works even if worker is
            stopped)
          </p>
          <div className="rounded border border-border bg-surface-alt p-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                onClick={onGenerateOnce}
                disabled={busy}
              >
                {actionBusy === "once" ? "Generating…" : "Generate once"}
              </Button>
              <Button
                variant="primary"
                onClick={onGenerateBatch}
                disabled={busy}
              >
                {actionBusy === "batch" ? "Generating…" : "Generate batch"}
              </Button>
            </div>
            <p className="mt-2.5 text-sm text-text-muted">
              Once = single OPEN/CLOSE intention → trade-action-service. Batch
              count is fixed by the backend today.
            </p>
          </div>
        </section>

        <section aria-label="Last API response" className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">3. Last API response</h2>
          <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
            {lastResponse ? (
              <>
                <p
                  className={`text-sm font-medium ${
                    lastResponse.ok ? "text-text-muted" : "text-error"
                  }`}
                >
                  {lastResponse.method} {lastResponse.path} ·{" "}
                  {lastResponse.at}
                  {lastResponse.ok ? "" : " · failed"}
                </p>
                <pre className="m-0 mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-sm text-text">
                  {formatBody(lastResponse.body)}
                </pre>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No API calls yet. Start/stop or generate to see a response.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function formatBody(body: unknown): string {
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}
