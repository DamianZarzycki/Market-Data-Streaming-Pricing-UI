import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { FilterBar } from "@/components/layout/FilterBar";
import type { MarketDataClass } from "@/services/marketDataTypes";

export const MARKET_DATA_CLASSES: MarketDataClass[] = [
  "OPTION",
  "IRS",
  "BENCHMARK",
  "YIELD_CURVE",
  "EQUITY",
  "FX",
  "BOND",
];

export type DataClassFilter = MarketDataClass | "ALL";

export const ROW_LIMIT_OPTIONS = [5, 25, 50] as const;
export type RowLimit = (typeof ROW_LIMIT_OPTIONS)[number];

interface MarketDataFiltersProps {
  symbolQuery: string;
  selectedDataClass: DataClassFilter;
  rowLimit: RowLimit;
  onSymbolQueryChange: (value: string) => void;
  onDataClassChange: (dataClass: DataClassFilter) => void;
  onRowLimitChange: (limit: RowLimit) => void;
  onClear: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function MarketDataFilters({
  symbolQuery,
  selectedDataClass,
  rowLimit,
  onSymbolQueryChange,
  onDataClassChange,
  onRowLimitChange,
  onClear,
  collapsed,
  onToggleCollapse,
}: MarketDataFiltersProps) {
  return (
    <FilterBar
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      ariaLabel="Market data filters"
      actions={
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      }
    >
      <div className="flex min-w-[12rem] flex-col gap-2">
        <Field label="Symbol">
          <input
            type="search"
            value={symbolQuery}
            onChange={(event) => onSymbolQueryChange(event.target.value)}
            placeholder="Filter by symbol…"
            aria-label="Filter by symbol"
            className="rounded border border-border bg-surface-alt px-3 py-2 text-base text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </Field>
      </div>

      <div className="flex min-w-[10rem] flex-col gap-2">
        <Field label="Data Class">
          <Select
            value={selectedDataClass}
            aria-label="Filter by data class"
            onChange={(event) =>
              onDataClassChange(event.target.value as DataClassFilter)
            }
          >
            <option value="ALL">All</option>
            {MARKET_DATA_CLASSES.map((dataClass) => (
              <option key={dataClass} value={dataClass}>
                {dataClass}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex min-w-[7rem] flex-col gap-2">
        <Field label="Rows">
          <Select
            value={rowLimit}
            aria-label="Rows displayed"
            onChange={(event) =>
              onRowLimitChange(Number(event.target.value) as RowLimit)
            }
          >
            {ROW_LIMIT_OPTIONS.map((limit) => (
              <option key={limit} value={limit}>
                {limit}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </FilterBar>
  );
}
