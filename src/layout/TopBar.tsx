import type { Density } from "@/layout/AppShell";

interface TopBarProps {
  density: Density;
  onToggleDensity: () => void;
}

export function TopBar({ density, onToggleDensity }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden>
          ◆
        </span>
        <span className="topbar__title">Trading UI</span>
        <span className="topbar__subtitle">Market Data &amp; Pricing</span>
      </div>

      <div className="topbar__actions">
        <span className="status-pill status-pill--live" title="Global stream status">
          <span className="status-pill__dot" />
          Live
        </span>
        <button
          type="button"
          className="topbar__button"
          onClick={onToggleDensity}
          title="Toggle table density"
        >
          {density === "compact" ? "Comfortable" : "Compact"}
        </button>
      </div>
    </header>
  );
}
