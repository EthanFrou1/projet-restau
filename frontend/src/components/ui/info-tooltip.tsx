import type { ReactNode } from "react";
import { Info } from "lucide-react";

type Props = {
  content: ReactNode;
  className?: string;
};

export function InfoTooltip({ content, className }: Props) {
  return (
    <span className={`group relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="Afficher l'information"
      >
        <Info className="h-3 w-3" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border bg-popover p-2 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}

