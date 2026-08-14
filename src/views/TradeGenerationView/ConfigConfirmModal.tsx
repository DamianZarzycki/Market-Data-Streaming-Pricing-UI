import { useEffect, useId } from "react";
import { Button } from "@/components/ui/Button";
import type {
  TradeGenerationConfig,
  TradeGenerationConfigPatch,
} from "@/services/tradeGenerationTypes";

export interface ConfigConfirmPending {
  key: keyof TradeGenerationConfig;
  label: string;
  current: string;
  next: string;
  patch: TradeGenerationConfigPatch;
}

interface ConfigConfirmModalProps {
  pending: ConfigConfirmPending;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfigConfirmModal({
  pending,
  busy = false,
  error,
  onClose,
  onConfirm,
}: ConfigConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,15,20,0.72)] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-[10px] border border-border bg-surface"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold">
              Confirm config update
            </h2>
            <p className="text-sm text-text-muted">
              This will change the running generator settings
            </p>
          </div>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent text-base text-text-muted hover:text-text"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
          >
            ✕
          </button>
        </header>

        <div className="h-px bg-border" />

        <div className="px-5 py-4">
          <div className="rounded border border-border bg-surface-alt px-3 py-2.5">
            <dl className="m-0 flex flex-col gap-2 text-sm">
              <Row label="Field" value={pending.label} />
              <Row label="Current" value={pending.current} mono />
              <Row label="New" value={pending.next} mono />
              <Row label="Endpoint" value="PUT /config" mono />
            </dl>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border bg-surface-alt px-5 py-3.5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Updating…" : "Confirm update"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`m-0 ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
    </div>
  );
}
