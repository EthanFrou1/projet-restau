import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DirectionEntityGrid } from "@/components/direction/DirectionEntityGrid";
import { DirectionExportModal } from "@/components/direction/DirectionExportModal";
import { DirectionFilters } from "@/components/direction/DirectionFilters";
import { DirectionSummary } from "@/components/direction/DirectionSummary";
import { exportDirectionPdf } from "@/components/direction/exportPdf";
import { computeBestByMetric } from "@/components/direction/metrics";
import type { DirectionEntity, MonthlyItem, Restaurant } from "@/components/direction/types";

type Props = {
  restaurants: Restaurant[];
  openExportSignal?: number;
};

const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const intFmt = new Intl.NumberFormat("fr-FR");
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function DirectionExecutive({ restaurants, openExportSignal = 0 }: Props) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
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

  const restaurantByCode = useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.code, restaurant])),
    [restaurants]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const restaurant = restaurantByCode.get(item.restaurant_code);
      if (!restaurant) return false;
      if (selectedRestaurant !== "ALL" && item.restaurant_code !== selectedRestaurant) return false;
      return true;
    });
  }, [items, restaurantByCode, selectedRestaurant]);

  const entities = useMemo<DirectionEntity[]>(() => {
    const map = new Map<
      string,
      DirectionEntity & {
        tauxHoraireCount: number;
        osatCount: number;
        gxiCount: number;
        googleCount: number;
      }
    >();

    for (const item of filteredItems) {
      const restaurant = restaurantByCode.get(item.restaurant_code);
      if (!restaurant) continue;

      const key = restaurant.code;
      const current = map.get(key) ?? {
        key,
        label: `${restaurant.code} - ${restaurant.name}`,
        ca: 0,
        n1: 0,
        prev: 0,
        clients: 0,
        clientsN1: 0,
        caDelivery: 0,
        caClickCollect: 0,
        heuresPersonnel: 0,
        heuresTravail: 0,
        tauxHoraire: null,
        osat: null,
        gxi: null,
        google: null,
        tauxHoraireCount: 0,
        osatCount: 0,
        gxiCount: 0,
        googleCount: 0,
      };

      const kpi = item.kpi;
      current.ca += kpi?.ca_real ?? item.ca_net_total ?? 0;
      current.n1 += kpi?.n1_ht ?? 0;
      current.prev += kpi?.prev_ht ?? 0;
      current.clients += kpi?.clients ?? item.tac_total ?? 0;
      current.clientsN1 += kpi?.clients_n1 ?? 0;
      current.caDelivery += kpi?.ca_delivery ?? 0;
      current.caClickCollect += kpi?.ca_click_collect ?? 0;
      current.heuresPersonnel += kpi?.heures_personnel ?? 0;
      current.heuresTravail += kpi?.heures_travail ?? 0;
      if (kpi?.taux_horaire !== null && kpi?.taux_horaire !== undefined) {
        const prev = current.tauxHoraire ?? 0;
        current.tauxHoraire = prev + kpi.taux_horaire;
        current.tauxHoraireCount += 1;
      }
      if (kpi?.osat_score !== null && kpi?.osat_score !== undefined) {
        const prev = current.osat ?? 0;
        current.osat = prev + kpi.osat_score;
        current.osatCount += 1;
      }
      if (kpi?.gxi_score !== null && kpi?.gxi_score !== undefined) {
        const prev = current.gxi ?? 0;
        current.gxi = prev + kpi.gxi_score;
        current.gxiCount += 1;
      }
      if (kpi?.google_score !== null && kpi?.google_score !== undefined) {
        const prev = current.google ?? 0;
        current.google = prev + kpi.google_score;
        current.googleCount += 1;
      }

      map.set(key, current);
    }

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        tauxHoraire: entry.tauxHoraireCount > 0 ? (entry.tauxHoraire ?? 0) / entry.tauxHoraireCount : null,
        osat: entry.osatCount > 0 ? (entry.osat ?? 0) / entry.osatCount : null,
        gxi: entry.gxiCount > 0 ? (entry.gxi ?? 0) / entry.gxiCount : null,
        google: entry.googleCount > 0 ? (entry.google ?? 0) / entry.googleCount : null,
      }))
      .sort((a, b) => b.ca - a.ca);
  }, [filteredItems, restaurantByCode]);

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

  useEffect(() => {
    if (openExportSignal > 0) {
      setExportModalOpen(true);
    }
  }, [openExportSignal]);

  return (
    <section className="space-y-4">
      <DirectionFilters
        year={year}
        yearOptions={yearOptions}
        onYearChange={setYear}
        selectedRestaurant={selectedRestaurant}
        onSelectedRestaurantChange={setSelectedRestaurant}
        restaurants={restaurants}
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
          moneyFmt={moneyFmt}
          intFmt={intFmt}
          pctFmt={pctFmt}
        />
      )}

      <DirectionExportModal
        open={exportModalOpen}
        restaurantRows={entities}
        onCancel={() => setExportModalOpen(false)}
        onConfirm={(selection) => {
          const restaurantsFiltered = entities.filter((restaurant) =>
            selection.restaurantCodes.includes(restaurant.key)
          );

          exportDirectionPdf({
            year,
            modeLabel: "Restaurants",
            zoneRows: [],
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
