import { apiFetch } from "@/lib/api";

export async function getMyRestaurants() {
  return apiFetch<Array<{ id: number; code: string; name: string }>>("/restaurants/mine");
}

export async function listRestaurants() {
  return apiFetch<Array<{ id: number; code: string; name: string }>>("/debug/restaurants");
}

export async function createRestaurant(payload: { code: string; name: string }) {
  return apiFetch<{ id: number; code: string; name: string }>("/debug/restaurants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function setUserRestaurants(userId: number, restaurantCodes: string[]) {
  return apiFetch<Array<{ id: number; code: string; name: string }>>(
    `/debug/users/${userId}/restaurants`,
    {
      method: "PUT",
      body: JSON.stringify({ restaurant_codes: restaurantCodes }),
    }
  );
}
