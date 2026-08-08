import type { ReactNode } from "react";

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
      className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2 overflow-hidden rounded border border-border bg-surface px-3 py-2"
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
