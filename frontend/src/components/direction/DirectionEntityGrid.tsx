import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { METRICS, getMetricValue, type MetricKey } from "@/components/direction/metrics";
import type { DirectionEntity } from "@/components/direction/types";

type Props = {
  entities: DirectionEntity[];
  bestByMetric: Record<MetricKey, number | null>;
  moneyFmt: Intl.NumberFormat;
  intFmt: Intl.NumberFormat;
  pctFmt: Intl.NumberFormat;
};

export function DirectionEntityGrid({ entities, bestByMetric, moneyFmt, intFmt, pctFmt }: Props) {
  const [collapsedKeys, setCollapsedKeys] = useState<Record<string, boolean>>({});

  const formatValue = (format: "money" | "int" | "pct", value: number | null) => {
    if (value === null) return "—";
    if (format === "money") return moneyFmt.format(value);
    if (format === "int") return intFmt.format(value);
    return pctFmt.format(value);
  };

  const renderCard = (entity: DirectionEntity) => {
    const isCollapsed = collapsedKeys[entity.key] ?? false;

    return (
      <article key={entity.key} className="self-start overflow-hidden rounded-xl border-2 border-[#7a351d]/35">
        <header className="flex items-center justify-between bg-gradient-to-r from-[#4b1e12] via-[#5a2516] to-[#712b10] px-4 py-3 text-amber-50">
          <div className="text-sm font-semibold uppercase tracking-wide">{entity.label}</div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-amber-100/80">CA</div>
              <div className="text-xl font-bold">{moneyFmt.format(entity.ca)}</div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 border border-amber-100/35 text-amber-50 hover:bg-amber-50/15 hover:text-amber-50"
              onClick={() =>
                setCollapsedKeys((prev) => ({
                  ...prev,
                  [entity.key]: !isCollapsed,
                }))
              }
              aria-label={isCollapsed ? `Ouvrir ${entity.label}` : `Fermer ${entity.label}`}
              title={isCollapsed ? "Ouvrir le restaurant" : "Fermer le restaurant"}
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {!isCollapsed && (
          <div className="grid gap-0.5 bg-border/20 p-0.5">
            {METRICS.map((metric) => {
              const value = getMetricValue(entity, metric.key);
              const best = bestByMetric[metric.key];
              const isBest = value !== null && best !== null && value === best;

              return (
                <div
                  key={`${entity.key}-${metric.key}`}
                  className="flex items-center justify-between bg-background px-4 py-2"
                >
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className={`text-sm font-semibold ${isBest ? "text-emerald-600" : "text-foreground"}`}>
                    {formatValue(metric.format, value)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </article>
    );
  };

  const desktopColumns = useMemo(() => {
    const left: DirectionEntity[] = [];
    const right: DirectionEntity[] = [];
    let leftWeight = 0;
    let rightWeight = 0;

    for (const entity of entities) {
      const isCollapsed = collapsedKeys[entity.key] ?? false;
      const weight = isCollapsed ? 1 : METRICS.length + 1;

      if (leftWeight <= rightWeight) {
        left.push(entity);
        leftWeight += weight;
      } else {
        right.push(entity);
        rightWeight += weight;
      }
    }

    return { left, right };
  }, [entities, collapsedKeys]);

  return (
    <>
      <div className="space-y-4 xl:hidden">{entities.map((entity) => renderCard(entity))}</div>
      <div className="hidden items-start gap-4 xl:grid xl:grid-cols-2">
        <div className="space-y-4">{desktopColumns.left.map((entity) => renderCard(entity))}</div>
        <div className="space-y-4">{desktopColumns.right.map((entity) => renderCard(entity))}</div>
      </div>
    </>
  );
}
