import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border-accent-strong bg-accent text-white hover:bg-accent-strong",
  secondary:
    "border-border bg-surface-alt text-text hover:border-accent",
};

export function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded border px-4 py-2 text-base",
        variantClass[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
