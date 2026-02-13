import { useMemo, useState } from "react";
import { METRICS, getMetricValue, type MetricKey } from "@/components/direction/metrics";
import type {
  DirectionEntity,
  DirectionViewMode,
  RestaurantZone,
  ZoneRestaurantStats,
} from "@/components/direction/types";
import { ZONE_COLORS, zoneToLabel } from "@/components/direction/zoneColors";

type Props = {
  entities: DirectionEntity[];
  bestByMetric: Record<MetricKey, number | null>;
  viewMode: DirectionViewMode;
  moneyFmt: Intl.NumberFormat;
  intFmt: Intl.NumberFormat;
  pctFmt: Intl.NumberFormat;
};

const ZONE_TAB_KEY = "__ZONE__";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(100,116,139,${alpha})`;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toDirectionEntity(source: ZoneRestaurantStats): DirectionEntity {
  return {
    key: source.code,
    label: `${source.code} - ${source.name}`,
    ca: source.ca,
    n1: source.n1,
    prev: source.prev,
    clients: source.clients,
    clientsN1: source.clientsN1,
    caDelivery: source.caDelivery,
    caClickCollect: source.caClickCollect,
  };
}

export function DirectionEntityGrid({
  entities,
  bestByMetric,
  viewMode,
  moneyFmt,
  intFmt,
  pctFmt,
}: Props) {
  const [selectedTabByEntity, setSelectedTabByEntity] = useState<Record<string, string>>({});

  const formatValue = (format: "money" | "int" | "pct", value: number | null) => {
    if (value === null) return "—";
    if (format === "money") return moneyFmt.format(value);
    if (format === "int") return intFmt.format(value);
    return pctFmt.format(value);
  };

  const zoneCards = useMemo(() => {
    return entities.map((entity) => {
      const restaurants = entity.restaurants ?? [];
      const tabKey = selectedTabByEntity[entity.key] ?? ZONE_TAB_KEY;
      const selectedRestaurant = restaurants.find((restaurant) => restaurant.code === tabKey) ?? null;
      const selectedTarget = selectedRestaurant ? toDirectionEntity(selectedRestaurant) : entity;
      return { entity, restaurants, tabKey, selectedTarget };
    });
  }, [entities, selectedTabByEntity]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {zoneCards.map(({ entity, restaurants, tabKey, selectedTarget }) => {
        const zoneKey = (viewMode === "zone" ? entity.label : entity.zone) as RestaurantZone | undefined;
        const zoneColor = zoneKey ? ZONE_COLORS[zoneKey] : ZONE_COLORS.NON_DEFINIE;
        const zonePctN1 = entity.n1 === 0 ? null : (entity.ca - entity.n1) / entity.n1;
        const zoneEcartPrev = entity.ca - entity.prev;

        return (
          <article
            key={entity.key}
            className="overflow-hidden rounded-xl"
            style={{ border: `2px solid ${zoneColor}` }}
          >
            <header
              className="flex items-center justify-between px-4 py-3 text-white"
              style={{ backgroundColor: zoneColor }}
            >
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide">
                  {viewMode === "zone" ? zoneToLabel(entity.label as RestaurantZone) : entity.label}
                </div>
                {entity.zone && viewMode === "restaurant" && (
                  <div className="text-xs text-white/85">{zoneToLabel(entity.zone)}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-white/80">CA</div>
                <div className="text-xl font-bold">{moneyFmt.format(entity.ca)}</div>
              </div>
            </header>

            {viewMode === "zone" && (
              <div className="border-b bg-muted/15 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Données globales de la {zoneToLabel(entity.label as RestaurantZone).toLowerCase()}
                </div>
                <div className="grid grid-cols-3 gap-2">
                <div
                  className="rounded-md border px-3 py-2"
                  style={{ backgroundColor: hexToRgba(zoneColor, 0.1), borderColor: hexToRgba(zoneColor, 0.35) }}
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">CA Zone</div>
                  <div className="text-sm font-semibold">{moneyFmt.format(entity.ca)}</div>
                </div>
                <div
                  className="rounded-md border px-3 py-2"
                  style={{ backgroundColor: hexToRgba(zoneColor, 0.1), borderColor: hexToRgba(zoneColor, 0.35) }}
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">% N-1</div>
                  <div className="text-sm font-semibold">{zonePctN1 === null ? "—" : pctFmt.format(zonePctN1)}</div>
                </div>
                <div
                  className="rounded-md border px-3 py-2"
                  style={{ backgroundColor: hexToRgba(zoneColor, 0.1), borderColor: hexToRgba(zoneColor, 0.35) }}
                >
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Écart vs prév</div>
                  <div className="text-sm font-semibold">{moneyFmt.format(zoneEcartPrev)}</div>
                </div>
                </div>
              </div>
            )}

            {viewMode === "zone" && restaurants.length > 0 && (
              <div className="border-b bg-muted/10 px-3 py-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Affichage détaillé
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      tabKey === ZONE_TAB_KEY
                        ? "text-white shadow-sm ring-2 ring-offset-1 ring-offset-background"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                    style={
                      tabKey === ZONE_TAB_KEY
                        ? {
                            backgroundColor: zoneColor,
                            borderColor: zoneColor,
                            boxShadow: `0 0 0 1px ${hexToRgba(zoneColor, 0.35)}`,
                          }
                        : undefined
                    }
                    onClick={() =>
                      setSelectedTabByEntity((prev) => ({ ...prev, [entity.key]: ZONE_TAB_KEY }))
                    }
                  >
                    Global zone
                  </button>
                  {restaurants.map((restaurant) => (
                    <button
                      key={`${entity.key}-${restaurant.code}`}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        tabKey === restaurant.code
                          ? "text-white shadow-sm ring-2 ring-offset-1 ring-offset-background"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                      style={
                        tabKey === restaurant.code
                          ? {
                              backgroundColor: zoneColor,
                              borderColor: zoneColor,
                              boxShadow: `0 0 0 1px ${hexToRgba(zoneColor, 0.35)}`,
                            }
                          : undefined
                      }
                      onClick={() =>
                        setSelectedTabByEntity((prev) => ({ ...prev, [entity.key]: restaurant.code }))
                      }
                    >
                      {restaurant.code}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-0.5 bg-border/20 p-0.5">
              {METRICS.map((metric) => {
                const value = getMetricValue(selectedTarget, metric.key);
                // Mise en avant du meilleur résultat uniquement sur la vue agrégée zone.
                const showBest = viewMode !== "zone" || tabKey === ZONE_TAB_KEY;
                const best = bestByMetric[metric.key];
                const isBest = showBest && value !== null && best !== null && value === best;

                return (
                  <div
                    key={`${entity.key}-${tabKey}-${metric.key}`}
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
            {viewMode === "zone" && tabKey !== ZONE_TAB_KEY && (
              <div className="border-t bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
                Détail restaurant sélectionné:{" "}
                <span className="font-medium text-foreground">
                  {restaurants.find((restaurant) => restaurant.code === tabKey)?.name ?? tabKey}
                </span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
