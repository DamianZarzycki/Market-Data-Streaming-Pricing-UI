import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { FilterBar } from "@/components/layout/FilterBar";
import type { AssetClass, Book, TradeStatus } from "@/domain/types";

const ASSET_CLASSES: AssetClass[] = ["EQUITY", "FX", "OPTION", "IRS"];

export type BookFilter = string | "ALL";
export type AssetClassFilter = AssetClass | "ALL";

interface BlotterFiltersProps {
  books: Book[];
  selectedBookId: BookFilter;
  selectedAssetClass: AssetClassFilter;
  selectedStatus: TradeStatus | "ALL";
  onBookChange: (bookId: BookFilter) => void;
  onAssetClassChange: (assetClass: AssetClassFilter) => void;
  onStatusChange: (status: TradeStatus | "ALL") => void;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function BlotterFilters({
  books,
  selectedBookId,
  selectedAssetClass,
  selectedStatus,
  onBookChange,
  onAssetClassChange,
  onStatusChange,
  onClear,
  collapsed,
  onToggleCollapse,
}: BlotterFiltersProps) {
  return (
    <FilterBar
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      ariaLabel="Blotter filters"
      actions={
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      }
    >
      <div className="flex min-w-[10rem] flex-col gap-2">
        <Field label="Book">
          <Select
            value={selectedBookId}
            aria-label="Filter by book"
            onChange={(event) =>
              onBookChange(event.target.value as BookFilter)
            }
            disabled={books.length === 0}
          >
            <option value="ALL">All</option>
            {books.map((book) => (
              <option key={book.book_id} value={book.book_id}>
                {book.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex min-w-[10rem] flex-col gap-2">
        <Field label="Asset Class">
          <Select
            value={selectedAssetClass}
            aria-label="Filter by asset class"
            onChange={(event) =>
              onAssetClassChange(event.target.value as AssetClassFilter)
            }
          >
            <option value="ALL">All</option>
            {ASSET_CLASSES.map((assetClass) => (
              <option key={assetClass} value={assetClass}>
                {assetClass}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex min-w-[8rem] flex-col gap-2">
        <Field label="Status">
          <Select
            value={selectedStatus}
            aria-label="Filter by status"
            onChange={(event) =>
              onStatusChange(event.target.value as TradeStatus | "ALL")
            }
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </Field>
      </div>
    </FilterBar>
  );
}
