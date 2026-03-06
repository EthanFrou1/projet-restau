export type Me = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

export type MonthlyItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
  comment?: string | null;
  comment_n1?: string | null;
  ca_net_total: number;
  ca_ttc_total: number;
  marge?: number;
  marge_n1?: number;
  taux_pertes?: number;
  taux_pertes_n1?: number;
  pertes_montant?: number;
  pertes_montant_n1?: number;
  tac_total: number;
  kpi: {
    n1_ht: number | null;
    var_n1: number | null;
    prev_ht: number | null;
    ca_real: number | null;
    clients: number | null;
    clients_n1: number | null;
    ca_delivery: number | null;
    ca_delivery_n1: number | null;
    client_delivery: number | null;
    client_delivery_n1: number | null;
    ca_drive: number | null;
    ca_drive_n1: number | null;
    client_drive: number | null;
    client_drive_n1: number | null;
    ca_click_collect: number | null;
    cnc_n1: number | null;
    client_click_collect: number | null;
    client_n1: number | null;
    cash_diff: number | null;
    heures_personnel: number | null;
    heures_personnel_n1: number | null;
    heures_travail: number | null;
    heures_travail_n1: number | null;
    taux_horaire: number | null;
    taux_horaire_n1: number | null;
    osat_score: number | null;
    osat_score_n1: number | null;
    gxi_score: number | null;
    gxi_score_n1: number | null;
    google_score: number | null;
    google_score_n1: number | null;
  } | null;
};

export type PeriodN1 = {
  ca: number;
  clients: number;
  ca_delivery: number;
  ca_drive: number;
  ca_click_collect: number;
  marge: number;
  pertes_montant: number;
};

export type PrevItem = {
  restaurant_code: string;
  report_date: string;
  ca: number;
  clients: number;
  ca_delivery: number;
  ca_drive: number;
  ca_click_collect: number;
  marge: number;
  pertes_montant: number;
};

export type MonthlyResponse = {
  items: MonthlyItem[];
  period_n1: PeriodN1;
  prev_items: PrevItem[];
};

export type Restaurant = {
  id: number;
  code: string;
  name: string;
  can_import?: boolean;
};

export type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
};

export type TabValue =
  | "overview"
  | "data"
  | "bk-global"
  | "bk-monthly"
  | "bk-compare"
  | "executive"
  | "budget"
  | "dev";

export type DashScope = "year" | "month" | "week" | "day" | "custom";
