import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FilterBarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  ariaLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function FilterBar({
  collapsed,
  onToggleCollapse,
  ariaLabel = "Filters",
  children,
  actions,
}: FilterBarProps) {
  return (
    <aside
      className={cn(
        "flex flex-row flex-wrap gap-x-8 gap-y-3 overflow-hidden rounded border border-border bg-surface px-4 py-3",
        collapsed ? "items-center" : "items-end",
      )}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="inline-flex cursor-pointer items-center gap-2 self-center rounded border border-border bg-transparent px-2 py-1 text-sm font-semibold text-text-muted hover:bg-surface-alt hover:text-text"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand filters" : "Collapse filters"}
      >
        <span className="text-sm leading-none" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
        Filters
      </button>

      {collapsed ? null : (
        <>
          {children}
          {actions ? (
            <div className="ml-auto flex flex-row gap-2">{actions}</div>
          ) : null}
        </>
      )}
    </aside>
  );
}
