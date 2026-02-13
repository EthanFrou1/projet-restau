import { useEffect, useMemo, useState } from "react";
import type { DirectionEntity, DirectionViewMode, RestaurantZone } from "@/components/direction/types";
import { zoneToLabel } from "@/components/direction/zoneColors";

type Props = {
  open: boolean;
  viewMode: DirectionViewMode;
  zoneRows: DirectionEntity[];
  restaurantRows: DirectionEntity[];
  onCancel: () => void;
  onConfirm: (selection: {
    includeZones: boolean;
    includeRestaurants: boolean;
    zoneKeys: string[];
    restaurantCodes: string[];
  }) => void;
};

export function DirectionExportModal({
  open,
  viewMode,
  zoneRows,
  restaurantRows,
  onCancel,
  onConfirm,
}: Props) {
  const [includeZones, setIncludeZones] = useState(true);
  const [includeRestaurants, setIncludeRestaurants] = useState(true);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const zones = useMemo(
    () =>
      zoneRows.map((zone) => ({
        key: zone.key,
        label: zoneToLabel(zone.key as RestaurantZone),
      })),
    [zoneRows]
  );

  const restaurants = useMemo(
    () =>
      restaurantRows.map((restaurant) => ({
        key: restaurant.key,
        label: restaurant.label,
      })),
    [restaurantRows]
  );

  useEffect(() => {
    if (!open) return;
    setIncludeZones(true);
    setIncludeRestaurants(true);
    setSelectedZones(zones.map((zone) => zone.key));
    setSelectedRestaurants(restaurants.map((restaurant) => restaurant.key));
  }, [open, zones, restaurants]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border bg-background shadow-lg">
        <div className="space-y-2 border-b p-4">
          <h3 className="text-base font-semibold">Configurer l'export PDF</h3>
          <p className="text-sm text-muted-foreground">
            Choisis les données à inclure dans le PDF ({viewMode === "zone" ? "vue Zones" : "vue Restaurants"}).
          </p>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeZones}
                onChange={(e) => setIncludeZones(e.target.checked)}
              />
              Inclure les données globales par zone
            </label>
            <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {zones.map((zone) => (
                <label key={zone.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedZones.includes(zone.key)}
                    onChange={(e) => {
                      setSelectedZones((prev) =>
                        e.target.checked
                          ? [...prev, zone.key]
                          : prev.filter((key) => key !== zone.key)
                      );
                    }}
                  />
                  {zone.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeRestaurants}
                onChange={(e) => setIncludeRestaurants(e.target.checked)}
              />
              Inclure les données par restaurant
            </label>
            <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {restaurants.map((restaurant) => (
                <label key={restaurant.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRestaurants.includes(restaurant.key)}
                    onChange={(e) => {
                      setSelectedRestaurants((prev) =>
                        e.target.checked
                          ? [...prev, restaurant.key]
                          : prev.filter((key) => key !== restaurant.key)
                      );
                    }}
                  />
                  {restaurant.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button
            type="button"
            className="h-10 rounded-md border px-4 text-sm"
            onClick={onCancel}
          >
            Annuler
          </button>
          <button
            type="button"
            className="h-10 rounded-md border bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() =>
              onConfirm({
                includeZones,
                includeRestaurants,
                zoneKeys: selectedZones,
                restaurantCodes: selectedRestaurants,
              })
            }
          >
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
}
