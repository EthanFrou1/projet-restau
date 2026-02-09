import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type NavItem = {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type UserInfo = {
  role: string;
};

type Props = {
  activeTab: string;
  navItems: NavItem[];
  me: UserInfo | null;
  displayName: string;
  loading: boolean;
  importsTodoCount?: number;
  onTabChange: (tab: string) => void;
};

export function DashboardSidebar({
  activeTab,
  navItems,
  me,
  displayName,
  loading,
  importsTodoCount = 0,
  onTabChange,
}: Props) {
  return (
    <aside className="border-b border-slate-500/40 bg-gradient-to-b from-slate-800 via-slate-700 to-zinc-800 text-slate-100 md:sticky md:top-0 md:h-screen md:w-72 md:flex-shrink-0 md:self-start md:border-b-0 md:border-r">
      <div className="flex h-full flex-col p-4 md:p-6">
        <div className="space-y-2">
          <div className="text-xl font-semibold tracking-tight">Projet Restau</div>
          <div className="text-sm text-slate-300">Gestion et suivi des rapports</div>
        </div>

        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            return (
              <Button
                key={item.value}
                variant="ghost"
                className={
                  isActive
                    ? "h-11 justify-start gap-2 bg-white/25 text-white hover:bg-white/30"
                    : "h-11 justify-start gap-2 text-slate-100 hover:bg-white/15 hover:text-white"
                }
                onClick={() => onTabChange(item.value)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.value === "data" && importsTodoCount > 0 && (
                  <span
                    className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white"
                    aria-label={`${importsTodoCount} import${importsTodoCount > 1 ? "s" : ""} à faire aujourd'hui`}
                    title={`${importsTodoCount} import${importsTodoCount > 1 ? "s" : ""} à faire aujourd'hui`}
                  >
                    {importsTodoCount}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-6">
          {me ? (
            <div className="rounded-xl border border-white/25 bg-white/15 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-lg font-semibold">
                  {displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  {displayName && <div className="text-base font-semibold leading-tight">{displayName}</div>}
                  <div className="text-sm font-medium text-slate-300">{me.role}</div>
                </div>
              </div>
            </div>
          ) : (
            <Badge variant="outline" className="w-fit border-white/20 text-white">
              {loading ? "Loading..." : "Not logged"}
            </Badge>
          )}
        </div>
      </div>
    </aside>
  );
}
