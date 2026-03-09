export type Restaurant = { id: number; myrhis_id?: number | null; code: string; name: string; can_import?: boolean };

export type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
};

export type OverdueGroup = { date: string; restaurants: Restaurant[] };
export type OverdueRow = { date: string; restaurant: Restaurant };

export type FileSpec = {
  id:
    | "caparprofit"
    | "consommationparprofit"
    | "corrections"
    | "divers"
    | "reglement"
    | "remises"
    | "tva"
    | "vente_annexes";
  label: string;
  formKey: string;
};

export type FilesState = Record<FileSpec["id"], File | null>;
export type FileErrorsState = Record<FileSpec["id"], string | null>;

export type TodayRow = {
  restaurant: Restaurant;
  report?: ReportListItem;
  isDone: boolean;
};

export type ReimportRequest = {
  reportId: number;
  restaurantCode: string;
  reportDate: string;
};
