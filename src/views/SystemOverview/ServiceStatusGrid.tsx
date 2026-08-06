import type { DerivedServiceCard } from "@/views/SystemOverview/deriveOverview";
import type { OverviewServiceId } from "@/views/SystemOverview/serviceCatalog";
import { ServiceStatusCard } from "@/views/SystemOverview/ServiceStatusCard";

interface ServiceStatusGridProps {
  cards: DerivedServiceCard[];
  selectedId: OverviewServiceId | null;
  onSelect: (id: OverviewServiceId) => void;
  onOpen: (id: OverviewServiceId) => void;
}

export function ServiceStatusGrid({
  cards,
  selectedId,
  onSelect,
  onOpen,
}: ServiceStatusGridProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-end justify-between gap-2 px-4 pb-2 pt-2.5">
        <div>
          <h2 className="text-base font-semibold">Microservice status</h2>
          <p className="text-sm text-text-muted">
            Select a service for details · click Open to jump to its view
          </p>
        </div>
        <span className="shrink-0 text-sm text-text-muted">
          {cards.length} services
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-cols-1 gap-2 min-[700px]:grid-cols-2 min-[900px]:grid-cols-3">
          {cards.map((card, index) => (
            <ServiceStatusCard
              key={card.id}
              card={card}
              selected={selectedId === card.id}
              wide={index === cards.length - 1 && cards.length % 3 === 1}
              onSelect={() => onSelect(card.id)}
              onOpen={() => onOpen(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
