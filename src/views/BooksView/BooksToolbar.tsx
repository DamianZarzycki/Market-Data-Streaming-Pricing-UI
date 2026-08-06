import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import type { AssetClass } from "@/domain/types";
import { BOOK_ASSET_CLASSES } from "@/services/booksTypes";

export type AssetClassFilter = AssetClass | "ALL";

interface BooksToolbarProps {
  assetClass: AssetClassFilter;
  assetClassOptions?: AssetClass[];
  search: string;
  onAssetClassChange: (value: AssetClassFilter) => void;
  onSearchChange: (value: string) => void;
  onNewBook: () => void;
}

export function BooksToolbar({
  assetClass,
  assetClassOptions = BOOK_ASSET_CLASSES,
  search,
  onAssetClassChange,
  onSearchChange,
  onNewBook,
}: BooksToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-end gap-4 rounded border border-border bg-surface px-4 py-3"
      role="region"
      aria-label="Books toolbar"
    >
      <Button variant="primary" onClick={onNewBook}>
        + New book
      </Button>

      <Field label="Asset class" className="min-w-[10rem]">
        <Select
          value={assetClass}
          aria-label="Filter by asset class"
          onChange={(event) =>
            onAssetClassChange(event.target.value as AssetClassFilter)
          }
        >
          <option value="ALL">All classes</option>
          {assetClassOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Search" className="min-w-[16rem] flex-1">
        <input
          type="search"
          value={search}
          placeholder="Search books…"
          aria-label="Search books"
          onChange={(event) => onSearchChange(event.target.value)}
          className="rounded border border-border bg-surface-alt px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </Field>
    </div>
  );
}
