import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { FilterBar } from "@/components/layout/FilterBar";
import type { AssetClass, Book, LiveStatus } from "@/domain/types";

const ASSET_CLASSES: AssetClass[] = ["EQUITY", "FX", "OPTION", "IRS"];

export type BookFilter = string | "ALL";
export type AssetClassFilter = AssetClass | "ALL";
export type StatusFilter = LiveStatus | "ALL";

interface PricingFiltersProps {
  books: Book[];
  selectedBookId: BookFilter;
  selectedAssetClass: AssetClassFilter;
  selectedStatus: StatusFilter;
  onBookChange: (bookId: BookFilter) => void;
  onAssetClassChange: (assetClass: AssetClassFilter) => void;
  onStatusChange: (status: StatusFilter) => void;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function PricingFilters({
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
}: PricingFiltersProps) {
  return (
    <FilterBar
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      ariaLabel="Pricing filters"
      actions={
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      }
    >
      <Field label="Book" orientation="horizontal" className="min-w-[10rem]">
        <Select
          value={selectedBookId}
          aria-label="Filter by book"
          className="py-1.5"
          onChange={(event) =>
            onBookChange(event.target.value as BookFilter)
          }
          disabled={books.length === 0}
        >
          <option value="ALL">All books</option>
          {books.map((book) => (
            <option key={book.book_id} value={book.book_id}>
              {book.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Asset Class"
        orientation="horizontal"
        className="min-w-[10rem]"
      >
        <Select
          value={selectedAssetClass}
          aria-label="Filter by asset class"
          className="py-1.5"
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

      <Field label="Status" orientation="horizontal" className="min-w-[8rem]">
        <Select
          value={selectedStatus}
          aria-label="Filter by valuation status"
          className="py-1.5"
          onChange={(event) =>
            onStatusChange(event.target.value as StatusFilter)
          }
        >
          <option value="ALL">All</option>
          <option value="LIVE">LIVE</option>
          <option value="STALE">STALE</option>
        </Select>
      </Field>
    </FilterBar>
  );
}
