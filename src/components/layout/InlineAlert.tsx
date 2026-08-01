import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface InlineAlertProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
}

export function InlineAlert({
  message,
  onRetry,
  retryLabel = "Retry",
  action,
}: InlineAlertProps) {
  return (
    <div
      className="shrink-0 border-b border-border bg-surface-alt px-4 py-3 text-base text-error"
      role="alert"
    >
      {message}
      {onRetry ? (
        <Button variant="secondary" className="ml-3" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
      {action}
    </div>
  );
}
