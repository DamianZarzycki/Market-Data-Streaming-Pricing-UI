import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface SideToggleProps {
  side: "BUY" | "SELL";
  onChange: (side: "BUY" | "SELL") => void;
}

export function SideToggle({ side, onChange }: SideToggleProps) {
  return (
    <Field label="Side">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={side === "BUY" ? "primary" : "secondary"}
          className="flex-1 justify-center"
          onClick={() => onChange("BUY")}
        >
          BUY
        </Button>
        <Button
          type="button"
          variant={side === "SELL" ? "primary" : "secondary"}
          className="flex-1 justify-center"
          onClick={() => onChange("SELL")}
        >
          SELL
        </Button>
      </div>
    </Field>
  );
}
