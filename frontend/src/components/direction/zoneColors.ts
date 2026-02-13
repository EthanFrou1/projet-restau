import type { RestaurantZone } from "@/components/direction/types";

export const ZONE_COLORS: Record<RestaurantZone, string> = {
  ZONE_EST: "#2563eb",
  ZONE_OUEST: "#7c3aed",
  ZONE_SUD: "#d97706",
  ZONE_NORD: "#0f766e",
  NON_DEFINIE: "#64748b",
};

export function zoneToLabel(zone: RestaurantZone): string {
  return zone === "NON_DEFINIE" ? "Non définie" : zone.replace("ZONE_", "Zone ");
}
