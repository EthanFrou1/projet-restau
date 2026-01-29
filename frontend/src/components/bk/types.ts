export type BKReport = {
  id: number;
  client_code: string;
  restaurant_code: string;
  report_date: string;
  created_at: string;
  kpi: {
    n1_ht: string | null;
    var_n1: string | null;
    prev_ht: string | null;
    ca_real: string | null;
    clients: number | null;
    clients_n1: number | null;
    ca_delivery: string | null;
    ca_delivery_n1: string | null;
    client_delivery: number | null;
    client_delivery_n1: number | null;
    ca_click_collect: string | null;
    cnc_n1: string | null;
    client_click_collect: number | null;
    client_n1: number | null;
    cash_diff: string | null;
  } | null;
  channel_sales: Array<{
    channel_label: string;
    is_total?: boolean;
    tac: number | null;
    ca_net: string | null;
    ca_ttc: string | null;
    pm_net: string | null;
    pm_ttc: string | null;
    net_total_profit: string | null;
  }>;
  consumption_modes: Array<{
    mode: string;
    tac: number | null;
    ca_ht: string | null;
    ca_ttc: string | null;
    pct: string | null;
  }>;
  corrections: Array<{ taux: string | null; montant: string | null; nombre: number | null }>;
  divers: Array<{
    nombre_repas_employes: number | null;
    nombre_commandes_ouvertes: number | null;
    montant_valorise_repas_employes: string | null;
    nombre_annulations: number | null;
    montant_annulations: string | null;
    taux_commandes_ouvertes: string | null;
    taux_repas_employes: string | null;
    montant_commandes_ouvertes: string | null;
    taux_annulations: string | null;
  }>;
  payments: Array<{
    payment_type: string;
    theorique: string | null;
    preleve: string | null;
    compte: string | null;
    ecart: string | null;
  }>;
  remises: Array<{
    taux_remises: string | null;
    montant_remises: string | null;
    nombre_remises: number | null;
    taux_sauces_offertes: string | null;
    montant_sauces_offertes: string | null;
    nbr_sauces_offertes: number | null;
  }>;
  tva_summary: Array<{
    tva_label: string;
    ht: string | null;
    tva: string | null;
    ttc: string | null;
  }>;
  annex_sales: Array<{
    libelle: string;
    nbr: number | null;
    montant_ht: string | null;
    montant_ttc: string | null;
  }>;
};
