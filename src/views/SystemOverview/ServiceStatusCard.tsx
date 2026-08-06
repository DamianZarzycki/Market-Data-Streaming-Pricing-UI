import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { cn } from "@/lib/cn";
import type { DerivedServiceCard } from "@/views/SystemOverview/deriveOverview";
import {
  formatCount,
  formatLatency,
  formatRelative,
} from "@/views/SystemOverview/formatters";

interface ServiceStatusCardProps {
  card: DerivedServiceCard;
  selected: boolean;
  wide?: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function ServiceStatusCard({
  card,
  selected,
  wide = false,
  onSelect,
  onOpen,
}: ServiceStatusCardProps) {
  const lastEvent =
    card.lastEventLabel ??
    (card.lastCheckedAt ? formatRelative(card.lastCheckedAt) : "—");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer flex-col gap-2 rounded border bg-surface-alt p-3 text-left transition-colors",
        selected
          ? "border-accent ring-1 ring-accent/40"
          : "border-border hover:border-accent/60",
        wide && "min-[900px]:col-span-3",
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{card.catalog.label}</p>
          <p className="truncate text-[11px] text-text-muted">
            {card.catalog.description}
          </p>
        </div>
        <StatusPill tone={card.tone}>{card.status}</StatusPill>
      </div>

      <div className="flex gap-4">
        <Meta label="LATENCY" value={formatLatency(card.latencyMs)} />
        <Meta label="LAST EVENT" value={lastEvent} />
        <Meta
          label="ERRORS 5m"
          value={formatCount(card.errors5m)}
          valueClassName={
            card.errors5m != null && card.errors5m > 0
              ? "text-stale"
              : undefined
          }
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] text-text-muted">{card.footer}</p>
        <Button
          variant="primary"
          className="shrink-0 px-2 py-1 text-[11px]"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open →
        </Button>
      </div>
    </button>
  );
}

function Meta({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-px">
      <span className="text-[9px] font-medium uppercase tracking-[0.03em] text-text-muted">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[11px] tabular-nums text-text",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}
