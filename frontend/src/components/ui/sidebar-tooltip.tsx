import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarTooltipProps = {
  content: ReactNode;
  children: ReactNode;
  show?: boolean;
  className?: string;
  contentClassName?: string;
};

export function SidebarTooltip({
  content,
  children,
  show = true,
  className,
  contentClassName,
}: SidebarTooltipProps) {
  if (!show) {
    return <>{children}</>;
  }

  return (
    <div className={cn("group/sidebar-tooltip relative", className)}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-full top-1/2 z-50 ml-3 min-w-max -translate-y-1/2 translate-x-1",
          "rounded-lg border border-amber-200/60 bg-[#fff6e8]/95 px-3 py-1.5 text-xs font-semibold text-[#5a2516]",
          "opacity-0 shadow-[0_10px_28px_rgba(44,18,10,0.35)] backdrop-blur-sm transition-all duration-150 ease-out",
          "group-hover/sidebar-tooltip:translate-x-0 group-hover/sidebar-tooltip:opacity-100",
          "group-focus-within/sidebar-tooltip:translate-x-0 group-focus-within/sidebar-tooltip:opacity-100",
          contentClassName
        )}
      >
        <span
          aria-hidden="true"
          className="absolute -left-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-amber-200/60 bg-[#fff6e8]/95"
        />
        {content}
      </div>
    </div>
  );
}
