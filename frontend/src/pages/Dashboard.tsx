import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

type DashScope = "year" | "month" | "day";
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
  caCnc: number;
  caMagasin: number;
};
type Trend = { labels: string[]; n: number[]; n1: number[] };
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
  label: string;
  n: number;
  n1: number;
  nPoint: TrendPoint;
  n1Point: TrendPoint;
} | null;
type ChannelRow = { label: string; value: number; share: number };
type StoreQuickViewRow = { code: string; name: string; ca: number; caN1: number; clients: number };

type Props = {
  canSeeDailyBanner: boolean;
  dailyStatus: DailyStatus;
  onImportNow: () => void;
  dashScope: DashScope;
  setDashScope: (value: DashScope) => void;
  yearOptions: number[];
  dashYear: string;
  setDashYear: (value: string) => void;
  dashMonth: string;
  setDashMonth: (value: string) => void;
  dashDayFrom: string;
  setDashDayFrom: (value: string) => void;
  dashDayTo: string;
  setDashDayTo: (value: string) => void;
  dayOptions: string[];
  dayToOptions: string[];
  restaurants: Restaurant[];
  dashRestaurant: string;
  setDashRestaurant: (value: string) => void;
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
  channelMax: number;
  salesTrend: Trend;
  basketTrend: Trend;
  storeQuickView: StoreQuickViewRow[];
};

export function OverviewPage(props: Props) {
  return <DashboardOverview {...props} />;
}
