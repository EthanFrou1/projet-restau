export type UserRole = "ADMIN" | "MANAGER" | "READONLY" | "DEV";

export type RestaurantRef = {
  id: number;
  myrhis_id?: number | null;
  code: string;
  name: string;
};

export type DevUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

export type AssocUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
  restaurants: RestaurantRef[];
};
