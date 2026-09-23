import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import type { Book } from "@/domain/types";
import {
  fetchSymbolMap,
  type SymbolMap,
} from "@/services/providerQuotesService";
import type { OpenTradeActionPayload } from "@/services/tradeActionTypes";
import { BondTradeForm } from "@/views/TradeGenerationView/tradeTicket/BondTradeForm";
import { EquityTradeForm } from "@/views/TradeGenerationView/tradeTicket/EquityTradeForm";
import { EuropeanOptionTradeForm } from "@/views/TradeGenerationView/tradeTicket/EuropeanOptionTradeForm";
import { FuturesTradeForm } from "@/views/TradeGenerationView/tradeTicket/FuturesTradeForm";
import { FxTradeForm } from "@/views/TradeGenerationView/tradeTicket/FxTradeForm";
import { IrsTradeForm } from "@/views/TradeGenerationView/tradeTicket/IrsTradeForm";
import { formatRelative } from "@/views/TradeGenerationView/tradeTicket/quoteModel";
import type { TradeTicketDraft } from "@/views/TradeGenerationView/tradeTicket/types";

const EMPTY_SYMBOL_MAP: SymbolMap = {
  EQUITY: [],
  FX: [],
  BOND: [],
  IRS: [],
  FUTURES: [],
  FUTURES_CONTRACTS: {},
};

const TICKET_HINT: Record<string, string> = {
  FX: "Book a trade from the NBP FX table · GET /market-data/fx-quotes",
  BOND: "Book a trade from the FRED or ECB yield curve · GET /market-data/curve-quotes",
  IRS: "Book an interest rate swap. The curve tenor is the reference rate; contract terms are stored on the trade.",
  OPTION:
    "Book a European option. Spot comes from the equity quote; strike, volatility and maturity are on the ticket.",
  FUTURES:
    "Book a futures contract. The price tracks the linked ETF quote and value uses the contract multiplier.",
  EQUITY:
    "Book a trade from one selected market-data source · GET /market-data/stream",
};

interface GenerateTradeModalProps {
  books: Book[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: OpenTradeActionPayload) => void;
}

export function GenerateTradeModal({
  books,
  busy,
  error,
  onClose,
  onSubmit,
}: GenerateTradeModalProps) {
  const titleId = useId();
  const activeBooks = useMemo(
    () => books.filter((book) => book.is_active),
    [books],
  );
  const [bookId, setBookId] = useState(activeBooks[0]?.book_id ?? "");
  const [symbolMap, setSymbolMap] = useState<SymbolMap>(EMPTY_SYMBOL_MAP);
  const [draft, setDraft] = useState<TradeTicketDraft | null>(null);
  const [staleConfirmOpen, setStaleConfirmOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!bookId && activeBooks[0]) setBookId(activeBooks[0].book_id);
  }, [bookId, activeBooks]);

  const selectedBook = activeBooks.find((book) => book.book_id === bookId) ?? null;
  const assetClass = selectedBook?.expected_asset_class ?? "";

  useEffect(() => {
    let cancelled = false;
    fetchSymbolMap()
      .then((map) => {
        if (!cancelled) setSymbolMap(map);
      })
      .catch(() => {
        if (!cancelled) setSymbolMap(EMPTY_SYMBOL_MAP);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setStaleConfirmOpen(false);
  }, [bookId, assetClass]);

  const onDraftChange = useCallback((next: TradeTicketDraft | null) => {
    setDraft(next);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (staleConfirmOpen) {
        setStaleConfirmOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose, staleConfirmOpen]);

  const canSubmit = !busy && !!draft?.canSubmit && !!draft.payload;

  const submitSelected = () => {
    if (!canSubmit || !draft?.payload) return;
    onSubmit(draft.payload);
  };

  const handleSubmit = () => {
    if (!canSubmit || !draft) return;
    if (draft.status === "STALE") {
      setStaleConfirmOpen(true);
      return;
    }
    submitSelected();
  };

  const formProps = selectedBook
    ? { book: selectedBook, symbolMap, nowMs, onDraftChange }
    : null;

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
        className="flex w-full max-w-[920px] flex-col overflow-hidden rounded-[10px] border border-border bg-surface"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold">
              Generate trade
            </h2>
            <p className="text-sm text-text-muted">
              {TICKET_HINT[assetClass] ?? TICKET_HINT.EQUITY}
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

        <div className="scrollbar-none flex max-h-[75vh] flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Book">
              <Select
                value={bookId}
                onChange={(event) => setBookId(event.target.value)}
                className="bg-bg"
              >
                {activeBooks.length === 0 ? (
                  <option value="" disabled>
                    No active books
                  </option>
                ) : null}
                {activeBooks.map((book) => (
                  <option key={book.book_id} value={book.book_id}>
                    {book.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Asset class">
              <Select value={assetClass} disabled className="bg-bg">
                <option value={assetClass}>{assetClass || "—"}</option>
              </Select>
            </Field>
          </div>

          {formProps && assetClass === "EQUITY" ? (
            <EquityTradeForm key={bookId} {...formProps} />
          ) : null}
          {formProps && assetClass === "FX" ? (
            <FxTradeForm key={bookId} {...formProps} />
          ) : null}
          {formProps && assetClass === "BOND" ? (
            <BondTradeForm key={bookId} {...formProps} />
          ) : null}
          {formProps && assetClass === "IRS" ? (
            <IrsTradeForm key={bookId} {...formProps} />
          ) : null}
          {formProps && assetClass === "OPTION" ? (
            <EuropeanOptionTradeForm key={bookId} {...formProps} />
          ) : null}
          {formProps && assetClass === "FUTURES" ? (
            <FuturesTradeForm key={bookId} {...formProps} />
          ) : null}
          {selectedBook &&
          !["EQUITY", "FX", "BOND", "IRS", "OPTION", "FUTURES"].includes(
            assetClass,
          ) ? (
            <p className="text-sm text-text-muted">
              No ticket for {assetClass || "this book"}.
            </p>
          ) : null}

          {draft?.status === "STALE" && draft.quote ? (
            <p className="text-sm text-stale" role="status">
              Selected price time is{" "}
              {draft.quote.provider_timestamp
                ? formatRelative(draft.quote.provider_timestamp, nowMs)
                : "missing"}
              . Saving will ask you to confirm before the trade is generated.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-alt px-5 py-3.5">
          <p className="text-sm text-text-muted">
            LIVE books immediately · STALE asks for confirmation · MISSING
            cannot be booked
          </p>
          <div className="flex gap-2.5">
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
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {busy ? "Saving…" : "Save transaction"}
            </Button>
          </div>
        </div>
      </div>

      {staleConfirmOpen && draft?.quote ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(13,15,20,0.55)] p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setStaleConfirmOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-stale`}
            className="w-full max-w-[440px] overflow-hidden rounded-[10px] border border-border bg-surface"
          >
            <header className="px-5 py-4">
              <h2 id={`${titleId}-stale`} className="text-base font-semibold">
                Are you sure?
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                {draft.providerLabel} · {draft.symbol} is STALE. Provider time{" "}
                {draft.quote.provider_timestamp
                  ? formatRelative(draft.quote.provider_timestamp, nowMs)
                  : "is missing"}
                . The reference price may be outdated.
              </p>
            </header>
            <div className="flex justify-end gap-2.5 border-t border-border bg-surface-alt px-5 py-3.5">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStaleConfirmOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setStaleConfirmOpen(false);
                  submitSelected();
                }}
                disabled={!canSubmit}
              >
                Generate trade
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
