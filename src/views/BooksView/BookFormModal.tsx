import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import type { Book } from "@/domain/types";
import { BOOK_ASSET_CLASSES } from "@/services/booksTypes";

export interface BookFormValues {
  name: string;
  expected_asset_class: string;
  description: string;
}

interface BookFormModalProps {
  mode: "create" | "edit";
  book?: Book | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: BookFormValues) => void;
}

export function BookFormModal({
  mode,
  book,
  busy = false,
  error,
  onClose,
  onSubmit,
}: BookFormModalProps) {
  const titleId = useId();
  const [name, setName] = useState(book?.name ?? "");
  const [assetClass, setAssetClass] = useState(
    book?.expected_asset_class ?? "",
  );
  const [description, setDescription] = useState(book?.description ?? "");

  useEffect(() => {
    setName(book?.name ?? "");
    setAssetClass(book?.expected_asset_class ?? "");
    setDescription(book?.description ?? "");
  }, [book]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isCreate = mode === "create";
  const canSubmit =
    name.trim().length > 0 && assetClass.trim().length > 0 && !busy;

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
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold">
              {isCreate ? "Create book" : "Edit book"}
            </h2>
            <p className="text-sm text-text-muted">
              {isCreate
                ? "Add a new trading book with expected asset class"
                : "Update name or expected asset class"}
            </p>
          </div>
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

        <form
          className="flex flex-col gap-3.5 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onSubmit({
              name: name.trim(),
              expected_asset_class: assetClass,
              description: description.trim(),
            });
          }}
        >
          <Field label="Name">
            <input
              required
              value={name}
              placeholder="e.g. Equity Core"
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </Field>

          <Field label="Expected asset class">
            <Select
              required
              value={assetClass}
              onChange={(event) => setAssetClass(event.target.value)}
              className="bg-bg"
            >
              <option value="" disabled>
                Select class…
              </option>
              {BOOK_ASSET_CLASSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description">
            <input
              value={description}
              placeholder="Optional description"
              onChange={(event) => setDescription(event.target.value)}
              className="rounded border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </Field>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="-mx-5 mt-1 flex justify-end gap-2.5 border-t border-border bg-surface-alt px-5 py-3.5">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {busy
                ? isCreate
                  ? "Creating…"
                  : "Saving…"
                : isCreate
                  ? "Create book"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
