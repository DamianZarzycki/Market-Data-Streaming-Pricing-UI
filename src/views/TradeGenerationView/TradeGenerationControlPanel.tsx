import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { PanelHeader } from "@/components/layout/PanelHeader";
import type {
  LastApiResponse,
  TradeGenerationConfig,
} from "@/services/tradeGenerationTypes";
import type { ConfigConfirmPending } from "@/views/TradeGenerationView/ConfigConfirmModal";

type ConfigKey = keyof TradeGenerationConfig;

interface ConfigFieldDef {
  key: ConfigKey;
  label: string;
  confirmLabel: string;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
}

const CONFIG_FIELDS: ConfigFieldDef[] = [
  {
    key: "interval_ms",
    label: "Interval (ms)",
    confirmLabel: "Tick interval (ms)",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "batch_size",
    label: "Batch size",
    confirmLabel: "Batch size",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "open_weight_pct",
    label: "OPEN weight %",
    confirmLabel: "OPEN weight %",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "close_weight_pct",
    label: "CLOSE weight %",
    confirmLabel: "CLOSE weight %",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "qty_min",
    label: "Qty min",
    confirmLabel: "Qty min",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "qty_max",
    label: "Qty max",
    confirmLabel: "Qty max",
    format: (v) => String(v),
    parse: parseIntStrict,
  },
  {
    key: "price_min",
    label: "Price min",
    confirmLabel: "Price min",
    format: formatPrice,
    parse: parseFloatStrict,
  },
  {
    key: "price_max",
    label: "Price max",
    confirmLabel: "Price max",
    format: formatPrice,
    parse: parseFloatStrict,
  },
];

const FIELD_PAIRS: [ConfigFieldDef, ConfigFieldDef][] = [
  [CONFIG_FIELDS[0], CONFIG_FIELDS[1]],
  [CONFIG_FIELDS[2], CONFIG_FIELDS[3]],
  [CONFIG_FIELDS[4], CONFIG_FIELDS[5]],
  [CONFIG_FIELDS[6], CONFIG_FIELDS[7]],
];

interface TradeGenerationControlPanelProps {
  isRunning: boolean | null;
  config: TradeGenerationConfig | null;
  lastResponse: LastApiResponse | null;
  actionBusy: string | null;
  onStart: () => void;
  onStop: () => void;
  onGenerateOnce: () => void;
  onGenerateBatch: () => void;
  onRequestConfigUpdate: (pending: ConfigConfirmPending) => void;
}

export function TradeGenerationControlPanel({
  isRunning,
  config,
  lastResponse,
  actionBusy,
  onStart,
  onStop,
  onGenerateOnce,
  onGenerateBatch,
  onRequestConfigUpdate,
}: TradeGenerationControlPanelProps) {
  const running = Boolean(isRunning);
  const busy = actionBusy != null;
  const [drafts, setDrafts] = useState<Record<ConfigKey, string> | null>(null);

  useEffect(() => {
    if (!config) return;
    setDrafts((prev) => {
      // Keep local edits while a confirm is in flight; otherwise sync from server.
      if (prev != null && actionBusy === "config") return prev;
      return Object.fromEntries(
        CONFIG_FIELDS.map((field) => [field.key, field.format(config[field.key])]),
      ) as Record<ConfigKey, string>;
    });
  }, [config, actionBusy]);

  const batchLabel =
    config != null ? `Generate batch (${config.batch_size})` : "Generate batch";

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
                {actionBusy === "batch" ? "Generating…" : batchLabel}
              </Button>
            </div>
            <p className="mt-2.5 text-sm text-text-muted">
              Once = single OPEN/CLOSE intention → trade-action-service. Batch
              count comes from runtime config (batch_size).
            </p>
          </div>
        </section>

        <section aria-label="Runtime config" className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">3. Runtime config</h2>
          <p className="text-sm text-text-muted">
            Input + Update per field · confirmation modal before apply · PUT
            /config
          </p>
          <div className="rounded border border-border bg-surface-alt p-3">
            {config == null || drafts == null ? (
              <p className="text-sm text-text-muted">Loading config…</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {FIELD_PAIRS.map(([left, right]) => (
                  <div
                    key={left.key}
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    <ConfigRow
                      field={left}
                      value={drafts[left.key]}
                      current={config[left.key]}
                      disabled={busy}
                      onChange={(raw) =>
                        setDrafts((prev) =>
                          prev ? { ...prev, [left.key]: raw } : prev,
                        )
                      }
                      onUpdate={() =>
                        requestUpdate(
                          left,
                          drafts[left.key],
                          config,
                          onRequestConfigUpdate,
                        )
                      }
                    />
                    <ConfigRow
                      field={right}
                      value={drafts[right.key]}
                      current={config[right.key]}
                      disabled={busy}
                      onChange={(raw) =>
                        setDrafts((prev) =>
                          prev ? { ...prev, [right.key]: raw } : prev,
                        )
                      }
                      onUpdate={() =>
                        requestUpdate(
                          right,
                          drafts[right.key],
                          config,
                          onRequestConfigUpdate,
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section aria-label="Last API response" className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">4. Last API response</h2>
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
                No API calls yet. Start/stop, generate, or update config to see
                a response.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ConfigRow({
  field,
  value,
  current,
  disabled,
  onChange,
  onUpdate,
}: {
  field: ConfigFieldDef;
  value: string;
  current: number;
  disabled: boolean;
  onChange: (raw: string) => void;
  onUpdate: () => void;
}) {
  const parsed = field.parse(value);
  const unchanged =
    parsed != null &&
    Number(parsed) === Number(current) &&
    field.format(current) === value.trim();
  const invalid = parsed == null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className="w-[110px] shrink-0 text-sm text-text-muted">
        {field.label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-[88px] shrink-0 rounded border border-border bg-bg px-2 py-1.5 font-mono text-sm tabular-nums text-text focus:border-accent focus:outline-none disabled:opacity-60"
      />
      <Button
        variant="secondary"
        onClick={onUpdate}
        disabled={disabled || invalid || unchanged}
        className="shrink-0 px-2.5 py-1 text-sm"
      >
        Update
      </Button>
    </div>
  );
}

function requestUpdate(
  field: ConfigFieldDef,
  raw: string,
  config: TradeGenerationConfig,
  onRequestConfigUpdate: (pending: ConfigConfirmPending) => void,
) {
  const parsed = field.parse(raw);
  if (parsed == null) return;

  onRequestConfigUpdate({
    key: field.key,
    label: field.confirmLabel,
    current: field.format(config[field.key]),
    next: field.format(parsed),
    patch: { [field.key]: parsed },
  });
}

function parseIntStrict(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

function parseFloatStrict(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || Number.isNaN(Number(trimmed))) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

function formatPrice(value: number): string {
  return value.toFixed(2);
}

function formatBody(body: unknown): string {
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}
