import { apiFetch } from "@/lib/api";

export type RestaurantDto = { id: number; myrhis_id?: number | null; code: string; name: string; can_import?: boolean };

export async function getMyRestaurants() {
  return apiFetch<RestaurantDto[]>("/restaurants/mine");
}

export async function listRestaurants() {
  return apiFetch<RestaurantDto[]>("/admin/restaurants");
}

export async function createRestaurant(payload: { myrhis_id?: number | null; code: string; name: string }) {
  return apiFetch<RestaurantDto>("/admin/restaurants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function lookupMyRhisRestaurant(myrhisId: number, signal?: AbortSignal) {
  return apiFetch<{ myrhis_id: number; name: string }>(`/external/myrhis/restaurants/${myrhisId}`, { signal });
}

export async function debugMyRhisRestaurantLabor(myrhisId: number, dateValue: string) {
  const params = new URLSearchParams({ date: dateValue });
  return apiFetch<{
    myrhis_id: number;
    date: string;
    plannings: unknown;
    clockings: unknown;
  }>(`/external/myrhis/restaurants/${myrhisId}/labor-debug?${params.toString()}`);
}

export async function getMyRhisRestaurantLaborSummary(myrhisId: number, dateValue: string) {
  const params = new URLSearchParams({ date: dateValue });
  return apiFetch<{
    myrhis_id: number;
    date: string;
    plannedEmployees: number;
    actualEmployees: number;
    plannedShiftCount: number;
    actualClockingCount: number;
    plannedHours: number;
    actualHours: number;
    deltaHours: number;
    plannedByEmployee: Array<{ employeeId: number; shifts: number; minutes: number; hours: number }>;
    actualByEmployee: Array<{ employeeId: number; clockings: number; minutes: number; hours: number }>;
  }>(`/external/myrhis/restaurants/${myrhisId}/labor-summary?${params.toString()}`);
}

export async function setUserRestaurants(userId: number, restaurantCodes: string[]) {
  return apiFetch<RestaurantDto[]>(
    `/admin/users/${userId}/restaurants`,
    {
      method: "PUT",
      body: JSON.stringify({ restaurant_codes: restaurantCodes }),
    }
  );
}

export async function listUsersWithRestaurants() {
  return apiFetch<
    Array<{
      id: number;
      email: string;
      role: string;
      is_active: boolean;
      first_name?: string | null;
      last_name?: string | null;
      restaurants: RestaurantDto[];
    }>
  >("/admin/users-with-restaurants");
}
