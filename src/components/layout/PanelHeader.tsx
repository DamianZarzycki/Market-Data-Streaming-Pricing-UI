import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PanelHeader({ title, description, actions }: PanelHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        {description ? (
          <p className="text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
