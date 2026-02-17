import type { Restaurant } from "@/components/direction/types";

type Props = {
  year: string;
  yearOptions: number[];
  onYearChange: (value: string) => void;
  selectedRestaurant: "ALL" | string;
  onSelectedRestaurantChange: (value: "ALL" | string) => void;
  restaurants: Restaurant[];
  onExportPdf: () => void;
};

export function DirectionFilters({
  year,
  yearOptions,
  onYearChange,
  selectedRestaurant,
  onSelectedRestaurantChange,
  restaurants,
  onExportPdf,
}: Props) {
  return (
    <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-3">
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
        <div className="text-xs text-muted-foreground">Restaurant</div>
        <select
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={selectedRestaurant}
          onChange={(e) => onSelectedRestaurantChange(e.target.value as "ALL" | string)}
        >
          <option value="ALL">Tous les restaurants</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.code} value={restaurant.code}>
              {restaurant.code} - {restaurant.name}
            </option>
          ))}
        </select>
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
