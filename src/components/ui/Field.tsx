import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
  /** vertical = form stack; horizontal = compact filter row */
  orientation?: "vertical" | "horizontal";
}

export function Field({
  label,
  children,
  className,
  orientation = "vertical",
}: FieldProps) {
  return (
    <label
      className={cn(
        orientation === "horizontal"
          ? "flex flex-row items-center gap-2"
          : "flex flex-col gap-1",
        className,
      )}
    >
      <span
        className={cn(
          "text-sm text-text-muted",
          orientation === "horizontal" && "shrink-0 whitespace-nowrap",
        )}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "rounded border border-border bg-surface-alt px-2.5 py-1.5 text-sm text-text focus:border-accent focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
