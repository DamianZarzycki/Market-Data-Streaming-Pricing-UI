import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navItems } from "@/routes/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/** lucide-style "panel-left" icon; chevron flips to signal collapse/expand. */
function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      {collapsed ? <path d="m14 9 3 3-3 3" /> : <path d="m16 15-3-3 3-3" />}
    </svg>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-surface"
      aria-label="Primary navigation"
    >
      <div
        className={cn(
          "flex shrink-0 items-center px-3 py-2",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <button
          type="button"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-border bg-transparent text-text-muted hover:bg-surface-alt hover:text-text"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <PanelToggleIcon collapsed={collapsed} />
        </button>
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 pt-0",
          collapsed && "items-center px-2",
        )}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "rounded text-sm text-text-muted hover:bg-surface-alt hover:text-text",
                collapsed
                  ? "flex h-9 w-9 items-center justify-center font-semibold"
                  : "px-2.5 py-1.5",
                isActive &&
                  "bg-surface-alt text-text shadow-[inset_3px_0_0_var(--color-accent)]",
              )
            }
          >
            {collapsed ? item.short : item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
