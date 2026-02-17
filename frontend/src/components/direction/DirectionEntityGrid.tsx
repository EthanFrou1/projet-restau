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
  const formatValue = (format: "money" | "int" | "pct", value: number | null) => {
    if (value === null) return "—";
    if (format === "money") return moneyFmt.format(value);
    if (format === "int") return intFmt.format(value);
    return pctFmt.format(value);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {entities.map((entity) => (
        <article key={entity.key} className="overflow-hidden rounded-xl border-2 border-slate-300">
          <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide">{entity.label}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/80">CA</div>
              <div className="text-xl font-bold">{moneyFmt.format(entity.ca)}</div>
            </div>
          </header>

          <div className="grid gap-0.5 bg-border/20 p-0.5">
            {METRICS.map((metric) => {
              const value = getMetricValue(entity, metric.key);
              const best = bestByMetric[metric.key];
              const isBest = value !== null && best !== null && value === best;

              return (
                <div key={`${entity.key}-${metric.key}`} className="flex items-center justify-between bg-background px-4 py-2">
                  <div className="text-sm text-muted-foreground">{metric.label}</div>
                  <div className={`text-sm font-semibold ${isBest ? "text-emerald-600" : "text-foreground"}`}>
                    {formatValue(metric.format, value)}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
