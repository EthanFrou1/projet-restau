import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DirectionEntityGrid } from "@/components/direction/DirectionEntityGrid";
import { DirectionExportModal } from "@/components/direction/DirectionExportModal";
import { DirectionFilters } from "@/components/direction/DirectionFilters";
import { DirectionSummary } from "@/components/direction/DirectionSummary";
import { exportDirectionPdf } from "@/components/direction/exportPdf";
import { computeBestByMetric } from "@/components/direction/metrics";
import type {
  DirectionEntity,
  DirectionViewMode,
  MonthlyItem,
  Restaurant,
  RestaurantZone,
  ZoneRestaurantStats,
} from "@/components/direction/types";

type Props = {
  restaurants: Restaurant[];
};

const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const intFmt = new Intl.NumberFormat("fr-FR");
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function DirectionExecutive({ restaurants }: Props) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = useState<DirectionViewMode>("zone");
  const [selectedZone, setSelectedZone] = useState<"ALL" | RestaurantZone>("ALL");
  const [selectedRestaurant, setSelectedRestaurant] = useState<"ALL" | string>("ALL");
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 2, current - 1, current, current + 1];
  }, []);

  useEffect(() => {
    async function loadYear() {
      setLoading(true);
      setError(null);
      try {
        // On charge les 12 mois pour reconstruire la vue annuelle côté client.
        const chunks = await Promise.all(
          Array.from({ length: 12 }, (_, monthIdx) =>
            apiFetch<MonthlyItem[]>(`/reports/bk/monthly?year=${year}&month=${monthIdx + 1}`)
          )
        );
        setItems(chunks.flat());
      } catch (e: any) {
        setError(e?.message ?? "Erreur chargement revue direction");
      } finally {
        setLoading(false);
      }
    }
    loadYear();
  }, [year]);

  useEffect(() => {
    if (viewMode === "zone" && selectedRestaurant !== "ALL") {
      setSelectedRestaurant("ALL");
    }
  }, [viewMode, selectedRestaurant]);

  const restaurantByCode = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.code, restaurant])),
    [restaurants]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const restaurant = restaurantByCode.get(item.restaurant_code);
      if (!restaurant) return false;
      if (selectedZone !== "ALL" && restaurant.zone !== selectedZone) return false;
      if (
        viewMode === "restaurant" &&
        selectedRestaurant !== "ALL" &&
        item.restaurant_code !== selectedRestaurant
      ) {
        return false;
      }
      return true;
    });
  }, [items, restaurantByCode, selectedRestaurant, selectedZone, viewMode]);

  const entities = useMemo<DirectionEntity[]>(() => {
    const map = new Map<string, DirectionEntity>();
    const zoneRestaurants = new Map<string, Map<string, ZoneRestaurantStats>>();

    for (const item of filteredItems) {
      const restaurant = restaurantByCode.get(item.restaurant_code);
      if (!restaurant) continue;
      const key = viewMode === "zone" ? restaurant.zone : restaurant.code;
      const label = viewMode === "zone" ? restaurant.zone : `${restaurant.code} - ${restaurant.name}`;
      const current = map.get(key) ?? {
        key,
        label,
        zone: restaurant.zone,
        ca: 0,
        n1: 0,
        prev: 0,
        clients: 0,
        clientsN1: 0,
        caDelivery: 0,
        caClickCollect: 0,
      };

      const kpi = item.kpi;
      current.ca += kpi?.ca_real ?? item.ca_net_total ?? 0;
      current.n1 += kpi?.n1_ht ?? 0;
      current.prev += kpi?.prev_ht ?? 0;
      current.clients += kpi?.clients ?? item.tac_total ?? 0;
      current.clientsN1 += kpi?.clients_n1 ?? 0;
      current.caDelivery += kpi?.ca_delivery ?? 0;
      current.caClickCollect += kpi?.ca_click_collect ?? 0;

      map.set(key, current);

      if (viewMode === "zone") {
        const zoneKey = restaurant.zone;
        const inZone = zoneRestaurants.get(zoneKey) ?? new Map<string, ZoneRestaurantStats>();
        const currentRestaurant = inZone.get(restaurant.code) ?? {
          code: restaurant.code,
          name: restaurant.name,
          ca: 0,
          n1: 0,
          prev: 0,
          clients: 0,
          clientsN1: 0,
          caDelivery: 0,
          caClickCollect: 0,
        };
        currentRestaurant.ca += kpi?.ca_real ?? item.ca_net_total ?? 0;
        currentRestaurant.n1 += kpi?.n1_ht ?? 0;
        currentRestaurant.prev += kpi?.prev_ht ?? 0;
        currentRestaurant.clients += kpi?.clients ?? item.tac_total ?? 0;
        currentRestaurant.clientsN1 += kpi?.clients_n1 ?? 0;
        currentRestaurant.caDelivery += kpi?.ca_delivery ?? 0;
        currentRestaurant.caClickCollect += kpi?.ca_click_collect ?? 0;
        inZone.set(restaurant.code, currentRestaurant);
        zoneRestaurants.set(zoneKey, inZone);
      }
    }

    const rows = Array.from(map.values()).sort((a, b) => b.ca - a.ca);
    if (viewMode !== "zone") return rows;

    return rows.map((entity) => {
      const restaurantsInZone = zoneRestaurants.get(entity.key);
      if (!restaurantsInZone) return entity;
      return {
        ...entity,
        restaurants: Array.from(restaurantsInZone.values()).sort((a, b) => b.ca - a.ca),
      };
    });
  }, [filteredItems, restaurantByCode, viewMode]);

  const totals = useMemo(() => {
    return entities.reduce(
      (acc, entity) => {
        acc.ca += entity.ca;
        acc.n1 += entity.n1;
        acc.prev += entity.prev;
        return acc;
      },
      { ca: 0, n1: 0, prev: 0 }
    );
  }, [entities]);

  const bestByMetric = useMemo(() => computeBestByMetric(entities), [entities]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => selectedZone === "ALL" || restaurant.zone === selectedZone);
  }, [restaurants, selectedZone]);

  const exportDatasets = useMemo(() => {
    if (viewMode === "zone") {
      const zoneRows = entities;
      const restaurantRows = entities.flatMap((zone) =>
        (zone.restaurants ?? []).map((restaurant) => ({
          key: restaurant.code,
          label: `${restaurant.code} - ${restaurant.name}`,
          zone: zone.key as RestaurantZone,
          ca: restaurant.ca,
          n1: restaurant.n1,
          prev: restaurant.prev,
          clients: restaurant.clients,
          clientsN1: restaurant.clientsN1,
          caDelivery: restaurant.caDelivery,
          caClickCollect: restaurant.caClickCollect,
        }))
      );
      return { zoneRows, restaurantRows };
    }

    const restaurantRows = entities;
    const zoneMap = new Map<string, DirectionEntity>();
    for (const restaurant of restaurantRows) {
      const zoneKey = restaurant.zone ?? "NON_DEFINIE";
      const current = zoneMap.get(zoneKey) ?? {
        key: zoneKey,
        label: zoneKey,
        zone: zoneKey as RestaurantZone,
        ca: 0,
        n1: 0,
        prev: 0,
        clients: 0,
        clientsN1: 0,
        caDelivery: 0,
        caClickCollect: 0,
      };
      current.ca += restaurant.ca;
      current.n1 += restaurant.n1;
      current.prev += restaurant.prev;
      current.clients += restaurant.clients;
      current.clientsN1 += restaurant.clientsN1;
      current.caDelivery += restaurant.caDelivery;
      current.caClickCollect += restaurant.caClickCollect;
      zoneMap.set(zoneKey, current);
    }
    const zoneRows = Array.from(zoneMap.values());
    return { zoneRows, restaurantRows };
  }, [entities, viewMode]);

  return (
    <section className="space-y-4">
      <DirectionFilters
        year={year}
        yearOptions={yearOptions}
        onYearChange={setYear}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedZone={selectedZone}
        onSelectedZoneChange={setSelectedZone}
        selectedRestaurant={selectedRestaurant}
        onSelectedRestaurantChange={setSelectedRestaurant}
        restaurants={filteredRestaurants}
        onExportPdf={() => setExportModalOpen(true)}
      />

      <DirectionSummary
        totalCa={totals.ca}
        totalN1={totals.n1}
        totalPrev={totals.prev}
        moneyFmt={moneyFmt}
        pctFmt={pctFmt}
      />

      {loading && <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Chargement...</div>}
      {error && <div className="rounded-lg border border-destructive/50 bg-card p-4 text-sm text-destructive">{error}</div>}

      {!loading && !error && entities.length === 0 && (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Aucune donnée disponible pour ce périmètre.
        </div>
      )}

      {!loading && !error && entities.length > 0 && (
        <DirectionEntityGrid
          entities={entities}
          bestByMetric={bestByMetric}
          viewMode={viewMode}
          moneyFmt={moneyFmt}
          intFmt={intFmt}
          pctFmt={pctFmt}
        />
      )}

      <DirectionExportModal
        open={exportModalOpen}
        viewMode={viewMode}
        zoneRows={exportDatasets.zoneRows}
        restaurantRows={exportDatasets.restaurantRows}
        onCancel={() => setExportModalOpen(false)}
        onConfirm={(selection) => {
          const zonesFiltered = exportDatasets.zoneRows.filter((zone) =>
            selection.zoneKeys.includes(zone.key)
          );
          const restaurantsFiltered = exportDatasets.restaurantRows.filter(
            (restaurant) =>
              selection.restaurantCodes.includes(restaurant.key) &&
              (restaurant.zone ? selection.zoneKeys.includes(restaurant.zone) : true)
          );

          exportDirectionPdf({
            year,
            modeLabel: viewMode === "zone" ? "Zones" : "Restaurants",
            zoneRows: selection.includeZones ? zonesFiltered : [],
            restaurantRows: selection.includeRestaurants ? restaurantsFiltered : [],
            moneyFmt,
            intFmt,
            pctFmt,
          });
          setExportModalOpen(false);
        }}
      />
    </section>
  );
}
