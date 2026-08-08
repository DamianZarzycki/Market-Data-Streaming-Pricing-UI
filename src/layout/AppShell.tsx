import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  DensityProvider,
  type Density,
} from "@/layout/DensityContext";
import { Sidebar } from "@/layout/Sidebar";
import { TopBar } from "@/layout/TopBar";

export type { Density };

export function AppShell() {
  const [density, setDensity] = useState<Density>("compact");

  const toggleDensity = () =>
    setDensity((current) =>
      current === "compact" ? "comfortable" : "compact",
    );

  return (
    <DensityProvider density={density}>
      <div
        className="grid h-screen grid-cols-[var(--spacing-sidebar)_1fr] grid-rows-[var(--spacing-topbar)_1fr]"
        data-density={density}
      >
        <TopBar
          className="col-span-2"
          density={density}
          onToggleDensity={toggleDensity}
        />
        <Sidebar />
        <main className="flex min-h-0 flex-col overflow-hidden p-4">
          <Outlet />
        </main>
      </div>
    </DensityProvider>
  );
}
