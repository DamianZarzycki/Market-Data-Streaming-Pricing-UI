import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatusTone = "live" | "stale" | "error";

const toneClass: Record<StatusTone, string> = {
  live: "text-live",
  stale: "text-stale",
  error: "text-error",
};

interface StatusPillProps {
  tone?: StatusTone | string;
  children: ReactNode;
  title?: string;
  className?: string;
}

function normalizeTone(tone: string | undefined): StatusTone {
  const value = (tone ?? "live").toLowerCase();
  if (value === "stale") return "stale";
  if (value === "error") return "error";
  return "live";
}

export function StatusPill({
  tone = "live",
  children,
  title,
  className,
}: StatusPillProps) {
  const resolved = normalizeTone(tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface-alt px-1.5 py-0.5 text-sm",
        toneClass[resolved],
        className,
      )}
      title={title}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
