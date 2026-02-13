export type RestaurantZone = "NON_DEFINIE" | "ZONE_EST" | "ZONE_OUEST" | "ZONE_SUD" | "ZONE_NORD";

export type Restaurant = {
  id: number;
  code: string;
  name: string;
  zone: RestaurantZone;
};

export type MonthlyItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  ca_net_total: number;
  tac_total: number;
  kpi: {
    n1_ht: number | null;
    prev_ht: number | null;
    ca_real: number | null;
    clients: number | null;
    clients_n1: number | null;
    ca_delivery: number | null;
    ca_click_collect: number | null;
  } | null;
};

export type DirectionViewMode = "zone" | "restaurant";

export type ZoneRestaurantStats = {
  code: string;
  name: string;
  ca: number;
  n1: number;
  prev: number;
  clients: number;
  clientsN1: number;
  caDelivery: number;
  caClickCollect: number;
};

export type DirectionEntity = {
  key: string;
  label: string;
  zone?: RestaurantZone;
  ca: number;
  n1: number;
  prev: number;
  clients: number;
  clientsN1: number;
  caDelivery: number;
  caClickCollect: number;
  restaurants?: ZoneRestaurantStats[];
};
