import type { DashScope, Restaurant } from "@/components/dashboard/shell/types";

const selectClass = "h-10 w-full rounded-md border bg-background px-3 py-2 text-sm";

type Props = {
  dashScope: DashScope;
  dashYear: string;
  dashMonth: string;
  dashWeek: string;
  dashDayFrom: string;
  dashDayTo: string;
  dashRestaurant: string;
  yearOptions: number[];
  weekOptions: string[];
  dayOptions: string[];
  dayToOptions: string[];
  restaurants: Restaurant[];
  onDashScopeChange: (value: DashScope) => void;
  onDashYearChange: (value: string) => void;
  onDashMonthChange: (value: string) => void;
  onDashWeekChange: (value: string) => void;
  onDashDayFromChange: (value: string) => void;
  onDashDayToChange: (value: string) => void;
  onDashRestaurantChange: (value: string) => void;
};

export function OverviewFilters({
  dashScope,
  dashYear,
  dashMonth,
  dashWeek,
  dashDayFrom,
  dashDayTo,
  dashRestaurant,
  yearOptions,
  weekOptions,
  dayOptions,
  dayToOptions,
  restaurants,
  onDashScopeChange,
  onDashYearChange,
  onDashMonthChange,
  onDashWeekChange,
  onDashDayFromChange,
  onDashDayToChange,
  onDashRestaurantChange,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full space-y-1 sm:w-[140px]">
          <div className="text-xs text-muted-foreground">Periode</div>
          <select className={selectClass} value={dashScope} onChange={(e) => onDashScopeChange(e.target.value as DashScope)}>
            <option value="year">Annee</option>
            <option value="month">Mois</option>
            <option value="week">Semaine</option>
            <option value="day">Jour</option>
          </select>
        </div>
        <div className="w-full space-y-1 sm:w-[120px]">
          <div className="text-xs text-muted-foreground">Annee</div>
          <select className={selectClass} value={dashYear} onChange={(e) => onDashYearChange(e.target.value)}>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {dashScope === "month" || dashScope === "day" ? (
          <div className="w-full space-y-1 sm:w-[160px]">
            <div className="text-xs text-muted-foreground">Mois</div>
            <select className={selectClass} value={dashMonth} onChange={(e) => onDashMonthChange(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => {
                const label = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(new Date(2000, i, 1));
                const value = String(i + 1).padStart(2, "0");
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        ) : null}
        {dashScope === "week" ? (
          <div className="w-full space-y-1 sm:w-[120px]">
            <div className="text-xs text-muted-foreground">Semaine</div>
            <select className={selectClass} value={dashWeek} onChange={(e) => onDashWeekChange(e.target.value)}>
              {weekOptions.map((week) => (
                <option key={week} value={week}>
                  S{week}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {dashScope === "day" ? (
          <div className="w-full space-y-1 sm:w-[95px]">
            <div className="text-xs text-muted-foreground">Du</div>
            <select className={selectClass} value={dashDayFrom} onChange={(e) => onDashDayFromChange(e.target.value)}>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {dashScope === "day" ? (
          <div className="w-full space-y-1 sm:w-[95px]">
            <div className="text-xs text-muted-foreground">Au</div>
            <select className={selectClass} value={dashDayTo} onChange={(e) => onDashDayToChange(e.target.value)}>
              {dayToOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="w-full space-y-1 sm:w-[260px]">
          <div className="text-xs text-muted-foreground">Restaurant</div>
          <select className={selectClass} value={dashRestaurant} onChange={(e) => onDashRestaurantChange(e.target.value)}>
            <option value="">Tous les magasins</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.code}>
                {restaurant.code} - {restaurant.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
