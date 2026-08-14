
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  CONFIG_FIELD_META,
  type ConfigFieldKey,
} from "@/services/tradeGenerationTypes";

interface ConfirmConfigModalProps {
  fieldKey: ConfigFieldKey;
  currentValue: number;
  nextValue: number;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmConfigModal({
  fieldKey,
  currentValue,
  nextValue,
  busy,
  onCancel,
  onConfirm,
}: ConfirmConfigModalProps) {
  const label = CONFIG_FIELD_META[fieldKey].label;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(5_6_8_/0.72)] p-4"
      role="presentation"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-config-title"
        className="w-full max-w-[440px] overflow-hidden rounded border border-border bg-surface shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2
              id="confirm-config-title"
              className="text-lg font-semibold"
            >
              Confirm config update
            </h2>
            <p className="text-sm text-text-muted">
              This will change the running generator settings
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent text-base text-text-muted hover:text-text disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="rounded border border-stale/60 bg-stale/15 px-3 py-2.5">
            <p className="text-sm font-semibold">Are you sure?</p>
            <p className="mt-1 text-sm text-text">
              Updating {label} from {formatValue(currentValue)} →{" "}
              {formatValue(nextValue)}. The continuous worker would use the
              new value on the next loop iteration once PUT /config exists.
            </p>
          </div>

          <dl className="m-0 grid gap-2 rounded border border-border bg-surface-alt px-3 py-2.5 text-sm">
            <DiffRow label="Field" value={label} />
            <DiffRow label="Current" value={formatValue(currentValue)} mono />
            <DiffRow label="New" value={formatValue(nextValue)} mono />
            <DiffRow label="Endpoint" value="PUT /config" mono />
          </dl>
        </div>

        <div className="h-px bg-border" />

        <footer className="flex items-center justify-end gap-2 px-5 py-3.5">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Updating…" : "Confirm update"}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function DiffRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`m-0 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
