import { apiFetch } from "@/lib/api";

export type RestaurantDto = { id: number; code: string; name: string; can_import?: boolean };

export async function getMyRestaurants() {
  return apiFetch<RestaurantDto[]>("/restaurants/mine");
}

export async function listRestaurants() {
  return apiFetch<RestaurantDto[]>("/debug/restaurants");
}

export async function createRestaurant(payload: { code: string; name: string }) {
  return apiFetch<RestaurantDto>("/debug/restaurants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setUserRestaurants(userId: number, restaurantCodes: string[]) {
  return apiFetch<RestaurantDto[]>(
    `/debug/users/${userId}/restaurants`,
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
  >("/debug/users-with-restaurants");
}
