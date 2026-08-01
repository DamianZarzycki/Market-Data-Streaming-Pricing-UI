import { StatusPill } from "@/components/ui/StatusPill";
import type { Density } from "@/layout/DensityContext";
import { cn } from "@/lib/cn";

interface TopBarProps {
  density: Density;
  onToggleDensity: () => void;
  className?: string;
}

export function TopBar({ density, onToggleDensity, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b border-border bg-surface px-6",
        className,
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-lg text-accent" aria-hidden>
          ◆
        </span>
        <span className="text-lg font-semibold">Trading UI</span>
        <span className="text-sm text-text-muted">Market Data &amp; Pricing</span>
      </div>

      <div className="flex items-center gap-3">
        <StatusPill tone="live" title="Global stream status">
          Live
        </StatusPill>
        <button
          type="button"
          className="cursor-pointer rounded border border-border bg-surface-alt px-3 py-1 text-sm text-text hover:border-accent"
          onClick={onToggleDensity}
          title="Toggle table density"
        >
          {density === "compact" ? "Comfortable" : "Compact"}
        </button>
      </div>
    </header>
  );
}
