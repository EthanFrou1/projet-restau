import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DirectionEntity } from "@/components/direction/types";

type Props = {
  open: boolean;
  restaurantRows: DirectionEntity[];
  onCancel: () => void;
  onConfirm: (selection: {
    includeRestaurants: boolean;
    restaurantCodes: string[];
  }) => void;
};

export function DirectionExportModal({ open, restaurantRows, onCancel, onConfirm }: Props) {
  const [includeRestaurants, setIncludeRestaurants] = useState(true);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

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
    setIncludeRestaurants(true);
    setSelectedRestaurants(restaurants.map((restaurant) => restaurant.key));
  }, [open, restaurants]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border bg-background shadow-lg">
        <div className="space-y-2 border-b p-4">
          <h3 className="text-base font-semibold">Configurer l'export PDF</h3>
          <p className="text-sm text-muted-foreground">Choisis les restaurants à inclure dans le PDF.</p>
        </div>

        <div className="space-y-2 p-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeRestaurants}
              onChange={(e) => setIncludeRestaurants(e.target.checked)}
            />
            Inclure les données par restaurant
          </label>
          <div className="max-h-64 space-y-1 overflow-auto rounded-md border p-2">
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

        <div className="flex items-center justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() =>
              onConfirm({
                includeRestaurants,
                restaurantCodes: selectedRestaurants,
              })
            }
          >
            Exporter
          </Button>
        </div>
      </div>
    </div>
  );
}
