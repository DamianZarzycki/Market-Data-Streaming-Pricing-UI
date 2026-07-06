import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/layout/Sidebar";
import { TopBar } from "@/layout/TopBar";

export type Density = "compact" | "comfortable";

export function AppShell() {
  const [density, setDensity] = useState<Density>("comfortable");

  const toggleDensity = () =>
    setDensity((current) =>
      current === "compact" ? "comfortable" : "compact",
    );

  return (
    <div className="app-shell" data-density={density}>
      <TopBar density={density} onToggleDensity={toggleDensity} />
      <Sidebar />
      <main className="app-shell__content">
        <Outlet />
      </main>
    </div>
  );
}
