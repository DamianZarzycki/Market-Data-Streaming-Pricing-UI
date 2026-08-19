import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  DensityProvider,
  type Density,
} from "@/layout/DensityContext";
import { Sidebar } from "@/layout/Sidebar";
import { TopBar } from "@/layout/TopBar";
import { cn } from "@/lib/cn";
import { registerWorkerRole } from "@/services/sharedWorkerRole";

export type { Density };

export function AppShell() {
  const [density, setDensity] = useState<Density>("compact");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => registerWorkerRole("app"), []);

  const toggleDensity = () =>
    setDensity((current) =>
      current === "compact" ? "comfortable" : "compact",
    );

  const toggleSidebar = () => setSidebarCollapsed((current) => !current);

  return (
    <DensityProvider density={density}>
      <div
        className={cn(
          "grid h-screen grid-rows-[var(--spacing-topbar)_1fr]",
          sidebarCollapsed
            ? "grid-cols-[auto_1fr]"
            : "grid-cols-[var(--spacing-sidebar)_1fr]",
        )}
        data-density={density}
      >
        <TopBar
          className="col-span-2"
          density={density}
          onToggleDensity={toggleDensity}
        />
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="flex min-h-0 flex-col overflow-hidden p-4">
          <Outlet />
        </main>
      </div>
    </DensityProvider>
  );
}
