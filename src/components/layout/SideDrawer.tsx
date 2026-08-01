import type { ReactNode } from "react";

interface SideDrawerProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  collapsedLabel: string;
  ariaLabel?: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  children: ReactNode;
  /** Optional content between header and scroll body (e.g. tabs). */
  headerExtra?: ReactNode;
}

export function SideDrawer({
  collapsed,
  onToggleCollapse,
  collapsedLabel,
  ariaLabel = "Details",
  title,
  subtitle,
  trailing,
  children,
  headerExtra,
}: SideDrawerProps) {
  if (collapsed) {
    return (
      <aside
        className="flex min-w-0 flex-col items-center justify-start overflow-hidden rounded border border-border bg-surface py-3"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded border-none bg-transparent px-2 py-3 text-sm font-semibold text-text-muted [writing-mode:vertical-rl] hover:bg-surface-alt hover:text-text"
          onClick={onToggleCollapse}
          aria-expanded={false}
          aria-label={`Expand ${collapsedLabel}`}
        >
          <span
            className="text-sm leading-none [writing-mode:horizontal-tb]"
            aria-hidden="true"
          >
            ◂
          </span>
          {collapsedLabel}
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-border bg-surface"
      aria-label={ariaLabel}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {trailing}
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded border border-border bg-transparent p-1 text-sm font-semibold text-text-muted hover:bg-surface-alt hover:text-text"
            onClick={onToggleCollapse}
            aria-expanded={true}
            aria-label={`Collapse ${collapsedLabel}`}
          >
            <span className="text-sm leading-none" aria-hidden="true">
              ▸
            </span>
          </button>
        </div>
      </header>

      {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </aside>
  );
}
