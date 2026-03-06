import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

type DashScope = "year" | "month" | "week" | "day" | "custom";
type Restaurant = { id: number; code: string; name: string };
type DailyStatus = {
  loading: boolean;
  missing: Restaurant[];
  date: string | null;
  error: string | null;
  noRestaurants: boolean;
};
type Totals = {
  ca: number;
  caN1: number;
  clients: number;
  clientsN1: number;
  mp: number;
  mpN1: number;
  caDelivery: number;
  caDeliveryN1: number;
  caDrive: number;
  caDriveN1: number;
  caCnc: number;
  caCncN1: number;
  caMagasin: number;
  caMagasinN1: number;
  marge: number;
  margeN1: number;
  pertesMontant: number;
  pertesMontantN1: number;
  tauxPertes: number;
  tauxPertesN1: number;
};
type Trend = {
  labels: string[];
  n: number[];
  n1: number[];
  commentsN?: Array<string | null>;
  commentsN1?: Array<string | null>;
};
type TrendPoint = { x: number; y: number; value: number };
type TrendChart = {
  chartWidth: number;
  chartHeight: number;
  padLeft: number;
  padTop: number;
  h: number;
  w: number;
  yTicks: Array<{ ratio: number; y: number; value: string }>;
  xTicks: Array<{ idx: number; x: number; label: string }>;
  nPoints: TrendPoint[];
  n1Points: TrendPoint[];
  nLine: string;
  n1Line: string;
};
type HoveredTrend = {
  idx: number;
  label: string;
  n: number;
  n1: number;
  nPoint: TrendPoint;
  n1Point: TrendPoint;
} | null;
type ChannelRow = { label: string; value: number; share: number };
type ChannelTrendSeries = {
  key: "magasin" | "drive" | "delivery" | "cnc";
  label: string;
  color: string;
  n: number[];
  n1: number[];
};
type ChannelTrend = {
  labels: string[];
  series: ChannelTrendSeries[];
  commentsN?: Array<string | null>;
  commentsN1?: Array<string | null>;
};
type StoreQuickViewRow = { code: string; name: string; ca: number; caN1: number; clients: number };
type WorkforceQuickMetrics = {
  heuresPersonnel: number;
  heuresPersonnelN1: number | null;
  heuresTravail: number;
  heuresTravailN1: number | null;
  tauxHoraire: number | null;
  tauxHoraireN1: number | null;
  osat: number | null;
  osatN1: number | null;
  gxi: number | null;
  gxiN1: number | null;
  google: number | null;
  googleN1: number | null;
};

type Props = {
  canSeeDailyBanner: boolean;
  dailyStatus: DailyStatus;
  onImportNow: () => void;
  dashScope: DashScope;
  dashWeek: string;
  dashErr: string | null;
  dashLoading: boolean;
  filtersSummary: string;
  dashTotals: Totals;
  pctChange: (value: number, prev: number) => number | null;
  compactMoneyFmt: Intl.NumberFormat;
  intFmt: Intl.NumberFormat;
  moneyFmt: Intl.NumberFormat;
  pctFmt: Intl.NumberFormat;
  periodLabel: string;
  hoveredTrend: HoveredTrend;
  dashYearLabel: string;
  monthLabel: string;
  dashMonthLabel: string;
  trendChart: TrendChart;
  setHoveredTrendIndex: (value: number | null) => void;
  dashTrend: Trend;
  channelBreakdown: ChannelRow[];
  channelBreakdownN1: ChannelRow[];
  channelTrend: ChannelTrend;
  channelMax: number;
  salesTrend: Trend;
  basketTrend: Trend;
  storeQuickView: StoreQuickViewRow[];
  workforceQuickMetrics: WorkforceQuickMetrics;
};

export function OverviewPage(props: Props) {
  return <DashboardOverview {...props} />;
}
