import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InlineAlert } from "@/components/layout/InlineAlert";
import { PanelHeader } from "@/components/layout/PanelHeader";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import type { AssetClass, Book } from "@/domain/types";
import { ApiError } from "@/services/apiClient";
import { fetchBooks as fetchBlotterBooks, fetchTrades } from "@/services/blotterService";
import {
  createBook,
  deleteBook,
  listBooks,
  updateBook,
} from "@/services/booksService";
import { BOOK_ASSET_CLASSES } from "@/services/booksTypes";
import { BookDeleteModal } from "@/views/BooksView/BookDeleteModal";
import {
  BookFormModal,
  type BookFormValues,
} from "@/views/BooksView/BookFormModal";
import {
  BooksDrawer,
  type BookPnlSnapshot,
} from "@/views/BooksView/BooksDrawer";
import { BooksTable } from "@/views/BooksView/BooksTable";
import {
  BooksToolbar,
  type AssetClassFilter,
} from "@/views/BooksView/BooksToolbar";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message;
  return fallback;
}

type ModalState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; book: Book }
  | { type: "delete"; book: Book };

export function BooksView() {
  const [books, setBooks] = useState<Book[]>([]);
  const [pnlByBookId, setPnlByBookId] = useState<
    Record<string, { realized?: number | null; unrealized?: number | null }>
  >({});
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [assetClass, setAssetClass] = useState<AssetClassFilter>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteProbeCount, setDeleteProbeCount] = useState<number | null>(
    null,
  );

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const list = await listBooks();
      setBooks(list);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Failed to load books"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  useEffect(() => {
    if (!selectedBookId) return;

    let cancelled = false;

    void fetchBlotterBooks()
      .then((blotterBooks) => {
        if (cancelled) return;
        const map: Record<
          string,
          { realized?: number | null; unrealized?: number | null }
        > = {};
        for (const book of blotterBooks) {
          map[book.book_id] = {
            realized: book.realized_pnl ?? null,
            unrealized: book.unrealized_pnl ?? null,
          };
        }
        setPnlByBookId(map);
      })
      .catch(() => {
        if (cancelled) return;
        // Keep prior cache entries; mark selected as unknown.
        setPnlByBookId((current) => ({
          ...current,
          [selectedBookId]: current[selectedBookId] ?? {
            realized: null,
            unrealized: null,
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBookId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter((book) => {
      if (assetClass !== "ALL" && book.expected_asset_class !== assetClass) {
        return false;
      }
      if (!q) return true;
      return (
        book.name.toLowerCase().includes(q) ||
        (book.description ?? "").toLowerCase().includes(q) ||
        book.book_id.toLowerCase().includes(q) ||
        book.expected_asset_class.toLowerCase().includes(q)
      );
    });
  }, [books, assetClass, search]);

  const assetClassOptions = useMemo(() => {
    const set = new Set<AssetClass>(BOOK_ASSET_CLASSES);
    for (const book of books) {
      if (book.expected_asset_class) set.add(book.expected_asset_class);
    }
    return Array.from(set);
  }, [books]);

  const selectedBook =
    books.find((book) => book.book_id === selectedBookId) ?? null;

  const selectedPnl: BookPnlSnapshot | null = selectedBook
    ? {
        realizedPnl: pnlByBookId[selectedBook.book_id]?.realized ?? null,
        unrealizedPnl: pnlByBookId[selectedBook.book_id]?.unrealized ?? null,
        activeTrades: null,
        alpha: null,
        beta: null,
      }
    : null;

  const activeCount = books.filter((book) => book.is_active).length;

  const openCreate = () => {
    setModalError(null);
    setModal({ type: "create" });
  };

  const openEdit = (book: Book) => {
    setModalError(null);
    setModal({ type: "edit", book });
  };

  const openDelete = (book: Book) => {
    setModalError(null);
    setModal({ type: "delete", book });
  };

  const closeModal = () => {
    if (modalBusy) return;
    setModal({ type: "none" });
    setModalError(null);
  };

  const handleFormSubmit = async (values: BookFormValues) => {
    setModalBusy(true);
    setModalError(null);
    try {
      if (modal.type === "create") {
        await createBook(values);
      } else if (modal.type === "edit") {
        await updateBook(modal.book.book_id, values);
      }
      setModal({ type: "none" });
      await refresh(false);
    } catch (err) {
      setModalError(errorMessage(err, "Failed to save book"));
    } finally {
      setModalBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (modal.type !== "delete") return;
    setModalBusy(true);
    setModalError(null);
    try {
      await deleteBook(modal.book.book_id);
      if (selectedBookId === modal.book.book_id) {
        setSelectedBookId(null);
      }
      setModal({ type: "none" });
      await refresh(false);
    } catch (err) {
      setModalError(errorMessage(err, "Failed to delete book"));
    } finally {
      setModalBusy(false);
    }
  };

  useEffect(() => {
    if (modal.type !== "delete") {
      setDeleteProbeCount(null);
      return;
    }

    let cancelled = false;
    void fetchTrades({
      book_id: modal.book.book_id,
      status: "ACTIVE",
      limit: 1,
    })
      .then((trades) => {
        if (!cancelled) setDeleteProbeCount(trades.length);
      })
      .catch(() => {
        if (!cancelled) setDeleteProbeCount(null);
      });

    return () => {
      cancelled = true;
    };
  }, [modal]);

  const blockedForDelete =
    modal.type === "delete" &&
    deleteProbeCount != null &&
    deleteProbeCount > 0;

  return (
    <>
      <WorkspaceLayout
        ariaLabel="Books service"
        drawerCollapsed={drawerCollapsed}
        filters={
          <BooksToolbar
            assetClass={assetClass}
            assetClassOptions={assetClassOptions}
            search={search}
            onAssetClassChange={setAssetClass}
            onSearchChange={setSearch}
            onNewBook={openCreate}
          />
        }
        main={
          <>
            <PanelHeader
              title="Trading Books"
              description="Manage books, expected asset class, and soft-delete with integrity checks"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => void refresh(true)}
                    disabled={loading}
                  >
                    {loading ? "Refreshing…" : "Refresh"}
                  </Button>
                  <span className="text-sm text-text-muted">
                    {activeCount} active
                  </span>
                </>
              }
            />

            {error ? (
              <InlineAlert
                message={error}
                onRetry={() => void refresh(true)}
              />
            ) : null}

            {loading && books.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                Loading books…
              </div>
            ) : (
              <BooksTable
                books={filtered}
                selectedBookId={selectedBookId}
                onSelect={(id) =>
                  setSelectedBookId((current) =>
                    current === id ? null : id,
                  )
                }
                onEdit={openEdit}
                onDelete={openDelete}
              />
            )}
          </>
        }
        drawer={
          <BooksDrawer
            book={selectedBook}
            pnl={selectedPnl}
            collapsed={drawerCollapsed}
            onToggleCollapse={() => setDrawerCollapsed((value) => !value)}
          />
        }
      />

      {modal.type === "create" || modal.type === "edit" ? (
        <BookFormModal
          mode={modal.type}
          book={modal.type === "edit" ? modal.book : null}
          busy={modalBusy}
          error={modalError}
          onClose={closeModal}
          onSubmit={(values) => void handleFormSubmit(values)}
        />
      ) : null}

      {modal.type === "delete" ? (
        <BookDeleteModal
          book={modal.book}
          blocked={Boolean(blockedForDelete)}
          blockedReason={
            blockedForDelete
              ? `Soft-delete blocked — this book still has active trade(s).`
              : null
          }
          busy={modalBusy}
          error={modalError}
          onClose={closeModal}
          onConfirm={() => void handleDeleteConfirm()}
        />
      ) : null}
    </>
  );
}
