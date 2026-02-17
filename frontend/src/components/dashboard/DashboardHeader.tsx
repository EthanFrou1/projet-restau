import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  roleBadge: ReactNode;
  activeTabLabel: string;
  activeTabDescription: string;
  onLogout: () => void;
  headerControls?: ReactNode;
};

export function DashboardHeader({
  roleBadge,
  activeTabLabel,
  activeTabDescription,
  onLogout,
  headerControls,
}: Props) {
  return (
    <header className="space-y-4 px-1 py-1">
      <div className="flex items-center justify-end gap-2">
        {roleBadge}
        <Button variant="outline" className="gap-2" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{activeTabLabel}</h1>
          {activeTabDescription && <p className="text-sm text-muted-foreground">{activeTabDescription}</p>}
        </div>
        {headerControls ? <div className="w-full lg:w-auto">{headerControls}</div> : null}
      </div>
    </header>
  );
}
