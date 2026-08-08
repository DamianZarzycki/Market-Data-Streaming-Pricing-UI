import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface WorkspaceLayoutProps {
  ariaLabel: string;
  filters: ReactNode;
  main: ReactNode;
  drawer: ReactNode;
  drawerCollapsed: boolean;
}

export function WorkspaceLayout({
  ariaLabel,
  filters,
  main,
  drawer,
  drawerCollapsed,
}: WorkspaceLayoutProps) {
  return (
    <section
      className="grid h-full min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden"
      aria-label={ariaLabel}
    >
      {filters}

      <div
        className={cn(
          "grid min-h-0 gap-3",
          drawerCollapsed
            ? "grid-cols-[minmax(0,1fr)_auto]"
            : "grid-cols-[minmax(0,1fr)_var(--spacing-side-drawer)] max-[1200px]:grid-cols-[minmax(0,1fr)_var(--spacing-side-drawer-sm)]",
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded border border-border bg-surface">
          {main}
        </div>
        {drawer}
      </div>
    </section>
  );
}
