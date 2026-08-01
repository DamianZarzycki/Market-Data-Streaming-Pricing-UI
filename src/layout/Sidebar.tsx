import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navItems } from "@/routes/navigation";

export function Sidebar() {
  return (
    <aside className="overflow-y-auto border-r border-border bg-surface p-3">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "rounded px-3 py-2 text-base text-text-muted hover:bg-surface-alt hover:text-text",
                isActive &&
                  "bg-surface-alt text-text shadow-[inset_3px_0_0_var(--color-accent)]",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
