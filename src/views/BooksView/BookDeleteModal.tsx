import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import type { Book } from "@/domain/types";

interface BookDeleteModalProps {
  book: Book;
  blocked: boolean;
  blockedReason?: string | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function BookDeleteModal({
  book,
  blocked,
  blockedReason,
  busy = false,
  error,
  onClose,
  onConfirm,
}: BookDeleteModalProps) {
  const titleId = useId();
  const [confirmName, setConfirmName] = useState("");

  const nameMatches = confirmName.trim() === book.name;
  const canDelete = !blocked && nameMatches && !busy;

  useEffect(() => {
    setConfirmName("");
  }, [book.book_id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(13,15,20,0.72)] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-[440px] flex-col overflow-hidden rounded-[10px] border border-border bg-surface"
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold">
            Delete book
          </h2>
          <button
            type="button"
            className="cursor-pointer border-none bg-transparent text-base text-text-muted hover:text-text"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-3 px-5 py-4">
          <p className="text-sm">
            Are you sure you want to delete “{book.name}”?
          </p>
          {blocked ? (
            <p className="text-sm text-stale">
              {blockedReason ??
                "Soft-delete is blocked while this book still has active trades."}
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              This soft-deletes the book (marks it inactive). Type the book name
              below to confirm.
            </p>
          )}

          {!blocked ? (
            <Field label={`Type “${book.name}” to confirm`}>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={confirmName}
                placeholder={book.name}
                disabled={busy}
                aria-label={`Type ${book.name} to confirm deletion`}
                onChange={(event) => setConfirmName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canDelete) {
                    event.preventDefault();
                    onConfirm();
                  }
                }}
                className="rounded border border-border bg-bg px-3 py-2.5 font-mono text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-50"
              />
            </Field>
          ) : null}

          {error ? (
            <p className="text-sm text-error" role="alert">
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
            variant="danger"
            disabled={!canDelete}
            onClick={onConfirm}
          >
            {blocked ? "Delete blocked" : busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
