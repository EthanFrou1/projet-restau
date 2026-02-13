import type { DirectionViewMode, Restaurant, RestaurantZone } from "@/components/direction/types";

type Props = {
  year: string;
  yearOptions: number[];
  onYearChange: (value: string) => void;
  viewMode: DirectionViewMode;
  onViewModeChange: (value: DirectionViewMode) => void;
  selectedZone: "ALL" | RestaurantZone;
  onSelectedZoneChange: (value: "ALL" | RestaurantZone) => void;
  selectedRestaurant: "ALL" | string;
  onSelectedRestaurantChange: (value: "ALL" | string) => void;
  restaurants: Restaurant[];
  onExportPdf: () => void;
};

const ZONE_OPTIONS: Array<"ALL" | RestaurantZone> = [
  "ALL",
  "ZONE_EST",
  "ZONE_OUEST",
  "ZONE_SUD",
  "ZONE_NORD",
];

export function DirectionFilters({
  year,
  yearOptions,
  onYearChange,
  viewMode,
  onViewModeChange,
  selectedZone,
  onSelectedZoneChange,
  selectedRestaurant,
  onSelectedRestaurantChange,
  restaurants,
  onExportPdf,
}: Props) {
  const showRestaurantFilter = viewMode === "restaurant";

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-5">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Année</div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
        >
          {yearOptions.map((option) => (
            <option key={option} value={String(option)}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Vue</div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value as DirectionViewMode)}
        >
          <option value="zone">Zones</option>
          <option value="restaurant">Restaurants</option>
        </select>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Zone</div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={selectedZone}
          onChange={(e) => onSelectedZoneChange(e.target.value as "ALL" | RestaurantZone)}
        >
          {ZONE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "Toutes les zones" : option}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Restaurant</div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={selectedRestaurant}
          onChange={(e) => onSelectedRestaurantChange(e.target.value as "ALL" | string)}
          disabled={!showRestaurantFilter}
        >
          <option value="ALL">Tous les restaurants</option>
          {showRestaurantFilter &&
            restaurants.map((restaurant) => (
              <option key={restaurant.code} value={restaurant.code}>
                {restaurant.code} - {restaurant.name}
              </option>
            ))}
        </select>
        {!showRestaurantFilter && (
          <div className="text-[11px] text-muted-foreground">Utilise les onglets restaurants dans chaque zone.</div>
        )}
      </div>
      <div className="flex items-end">
        <button
          type="button"
          className="h-10 w-full rounded-md border bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
          onClick={onExportPdf}
        >
          Export PDF
        </button>
      </div>
    </div>
  );
}
