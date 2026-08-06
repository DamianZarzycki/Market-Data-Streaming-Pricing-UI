import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import type { Book } from "@/domain/types";
import { cn } from "@/lib/cn";

interface BooksTableProps {
  books: Book[];
  selectedBookId: string | null;
  onSelect: (bookId: string) => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}

export function BooksTable({
  books,
  selectedBookId,
  onSelect,
  onEdit,
  onDelete,
}: BooksTableProps) {
  if (books.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-text-muted">
        No books match the current filters.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-base">
        <thead className="sticky top-0 z-10 bg-surface-alt">
          <tr className="text-left text-sm text-text-muted">
            <Th>Name</Th>
            <Th>Expected Class</Th>
            <Th>Status</Th>
            <Th>Description</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const selected = book.book_id === selectedBookId;
            return (
              <tr
                key={book.book_id}
                className={cn(
                  "cursor-pointer border-t border-border",
                  selected
                    ? "bg-accent text-text"
                    : "hover:bg-surface-alt/80",
                )}
                onClick={() => onSelect(book.book_id)}
              >
                <Td className="font-semibold">{book.name}</Td>
                <Td>{book.expected_asset_class}</Td>
                <Td>
                  <StatusPill tone={book.is_active ? "live" : "stale"}>
                    {book.is_active ? "ACTIVE" : "INACTIVE"}
                  </StatusPill>
                </Td>
                <Td className="max-w-[14rem] truncate text-text-muted">
                  {book.description?.trim() || "—"}
                </Td>
                <Td className="text-right">
                  <div
                    className="inline-flex gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="secondary"
                      className="px-2 py-1 text-sm"
                      onClick={() => onEdit(book)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-sm"
                      onClick={() => onDelete(book)}
                    >
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.03em]",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-2.5 align-middle", className)}>{children}</td>;
}
