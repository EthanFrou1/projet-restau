import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyImportBanner } from "@/components/dashboard/DailyImportBanner";

type DashScope = "year" | "month" | "week" | "day";
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
  key: "magasin" | "delivery" | "cnc";
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

export function DashboardOverview({
  canSeeDailyBanner,
  dailyStatus,
  onImportNow,
  dashScope,
  dashWeek,
  dashErr,
  dashLoading,
  filtersSummary,
  dashTotals,
  pctChange,
  compactMoneyFmt,
  intFmt,
  moneyFmt,
  pctFmt,
  periodLabel,
  hoveredTrend,
  dashYearLabel,
  monthLabel,
  dashMonthLabel,
  trendChart,
  setHoveredTrendIndex,
  dashTrend,
  channelBreakdown,
  channelBreakdownN1,
  channelTrend,
  salesTrend,
  basketTrend,
  storeQuickView,
  workforceQuickMetrics,
}: Props) {
  const normalizeComment = (value?: string | null) => {
    const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
    return cleaned.length > 0 ? cleaned : null;
  };
  const truncateComment = (value: string, max = 52) =>
    value.length > max ? `${value.slice(0, max).trimEnd()}...` : value;

  const [hoveredChannelIndex, setHoveredChannelIndex] = useState<number | null>(null);
  const [hoveredChannelLineIndex, setHoveredChannelLineIndex] = useState<number | null>(null);
  const [hoveredRevenueColumnIndex, setHoveredRevenueColumnIndex] = useState<number | null>(null);
  const [hoveredSalesColumnIndex, setHoveredSalesColumnIndex] = useState<number | null>(null);
  const [hoveredBasketColumnIndex, setHoveredBasketColumnIndex] = useState<number | null>(null);
  const channelColors = ["#0f766e", "#3b82f6", "#f59e0b"];
  const revenueColumnWidthClass =
    dashScope === "month"
      ? "w-12 shrink-0"
      : dashScope === "week"
        ? "min-w-[100px] flex-1"
        : "min-w-[56px] flex-1";
  const revenueColumnGapClass = dashScope === "month" ? "gap-2" : "gap-0";
  const revenuePairGapClass = "gap-4";
  const revenueChartMinWidth =
    dashScope === "month"
      ? Math.max(980, dashTrend.labels.length * 54)
      : dashScope === "year"
        ? 980
        : dashScope === "week"
          ? 720
          : 720;
  const metricColumnWidthClass =
    dashScope === "month"
      ? "w-12 shrink-0"
      : dashScope === "week"
        ? "min-w-[100px] flex-1"
        : "min-w-[56px] flex-1";
  const metricColumnGapClass = dashScope === "month" ? "gap-2" : "gap-0";
  const metricChartMinWidth =
    dashScope === "month"
      ? Math.max(980, Math.max(salesTrend.labels.length, basketTrend.labels.length) * 54)
      : 720;
  const visibleStoreQuickView = storeQuickView.filter(
    (store) => store.ca !== 0 || store.clients !== 0 || store.caN1 !== 0
  );
  const workforceCostRh =
    workforceQuickMetrics.heuresPersonnel > 0 && workforceQuickMetrics.tauxHoraire !== null
      ? workforceQuickMetrics.heuresPersonnel * workforceQuickMetrics.tauxHoraire + workforceQuickMetrics.heuresTravail
      : null;
  const workforceCostRhN1 =
    workforceQuickMetrics.heuresPersonnelN1 !== null &&
    workforceQuickMetrics.tauxHoraireN1 !== null &&
    workforceQuickMetrics.heuresTravailN1 !== null
      ? workforceQuickMetrics.heuresPersonnelN1 * workforceQuickMetrics.tauxHoraireN1 +
        workforceQuickMetrics.heuresTravailN1
      : null;
  const persoReelPct = workforceCostRh !== null && dashTotals.ca > 0 ? workforceCostRh / dashTotals.ca : null;
  const persoReelPctN1 =
    workforceCostRhN1 !== null && dashTotals.caN1 > 0 ? workforceCostRhN1 / dashTotals.caN1 : null;

  return (
    <TabsContent value="overview" className="space-y-4">
      <DailyImportBanner visible={canSeeDailyBanner} status={dailyStatus} onImportNow={onImportNow} />

      <div className="text-base text-muted-foreground">{filtersSummary}</div>
      {dashErr && <div className="text-sm text-destructive">{dashErr}</div>}
      {dashLoading && <div className="text-sm text-muted-foreground">Chargement du tableau de bord...</div>}

      <div className="flex flex-wrap gap-3">
        {[
          {
            label: "Chiffre d'affaires",
            value: compactMoneyFmt.format(dashTotals.ca),
            change: pctChange(dashTotals.ca, dashTotals.caN1),
            color: undefined,
          },
          {
            label: "Nombre de ventes",
            value: intFmt.format(dashTotals.clients),
            change: pctChange(dashTotals.clients, dashTotals.clientsN1),
            color: undefined,
          },
          {
            label: "Panier moyen",
            value: moneyFmt.format(dashTotals.mp || 0),
            change: pctChange(dashTotals.mp, dashTotals.mpN1),
            color: undefined,
          },
          {
            label: "CA delivery",
            value: compactMoneyFmt.format(dashTotals.caDelivery),
            change: pctChange(dashTotals.caDelivery, dashTotals.caDeliveryN1),
            color: channelColors[1],
          },
          {
            label: "CA Click & Collect",
            value: compactMoneyFmt.format(dashTotals.caCnc),
            change: pctChange(dashTotals.caCnc, dashTotals.caCncN1),
            color: channelColors[2],
          },
          {
            label: "CA Magasin",
            value: compactMoneyFmt.format(dashTotals.caMagasin),
            change: pctChange(dashTotals.caMagasin, dashTotals.caMagasinN1),
            color: channelColors[0],
          },
          {
            label: "Marge",
            value: compactMoneyFmt.format(dashTotals.marge),
            change: pctChange(dashTotals.marge, dashTotals.margeN1),
            color: "#0f172a",
          },
          {
            label: "Taux de pertes",
            value: pctFmt.format(dashTotals.tauxPertes),
            change: pctChange(dashTotals.tauxPertes, dashTotals.tauxPertesN1),
            color: "#b45309",
          },
          {
            label: "Heures personnel",
            value:
              workforceQuickMetrics.heuresPersonnel > 0
                ? `${workforceQuickMetrics.heuresPersonnel.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`
                : "—",
            change:
              workforceQuickMetrics.heuresPersonnelN1 !== null
                ? pctChange(workforceQuickMetrics.heuresPersonnel, workforceQuickMetrics.heuresPersonnelN1)
                : null,
            color: undefined,
          },
          {
            label: "Heures formation",
            value:
              workforceQuickMetrics.heuresTravail > 0
                ? `${workforceQuickMetrics.heuresTravail.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} h`
                : "—",
            change:
              workforceQuickMetrics.heuresTravailN1 !== null
                ? pctChange(workforceQuickMetrics.heuresTravail, workforceQuickMetrics.heuresTravailN1)
                : null,
            color: undefined,
          },
          {
            label: "Taux horaire",
            value:
              workforceQuickMetrics.tauxHoraire !== null
                ? `${workforceQuickMetrics.tauxHoraire.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`
                : "—",
            change:
              workforceQuickMetrics.tauxHoraire !== null && workforceQuickMetrics.tauxHoraireN1 !== null
                ? pctChange(workforceQuickMetrics.tauxHoraire, workforceQuickMetrics.tauxHoraireN1)
                : null,
            color: undefined,
          },
          {
            label: "Coût RH",
            value: workforceCostRh !== null ? compactMoneyFmt.format(workforceCostRh) : "—",
            change:
              workforceCostRh !== null && workforceCostRhN1 !== null
                ? pctChange(workforceCostRh, workforceCostRhN1)
                : null,
            color: "#6b7280",
          },
          {
            label: "% Perso réel",
            value: persoReelPct !== null ? pctFmt.format(persoReelPct) : "—",
            change:
              persoReelPct !== null && persoReelPctN1 !== null
                ? pctChange(persoReelPct, persoReelPctN1)
                : null,
            color: "#7c2d12",
          },
          {
            label: "OSAT",
            value:
              workforceQuickMetrics.osat !== null
                ? `${workforceQuickMetrics.osat.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`
                : "—",
            change:
              workforceQuickMetrics.osat !== null && workforceQuickMetrics.osatN1 !== null
                ? pctChange(workforceQuickMetrics.osat, workforceQuickMetrics.osatN1)
                : null,
            color: undefined,
          },
          {
            label: "GXI",
            value:
              workforceQuickMetrics.gxi !== null
                ? workforceQuickMetrics.gxi.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                : "—",
            change:
              workforceQuickMetrics.gxi !== null && workforceQuickMetrics.gxiN1 !== null
                ? pctChange(workforceQuickMetrics.gxi, workforceQuickMetrics.gxiN1)
                : null,
            color: undefined,
          },
          {
            label: "Google",
            value:
              workforceQuickMetrics.google !== null
                ? `${workforceQuickMetrics.google.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} /5`
                : "—",
            change:
              workforceQuickMetrics.google !== null && workforceQuickMetrics.googleN1 !== null
                ? pctChange(workforceQuickMetrics.google, workforceQuickMetrics.googleN1)
                : null,
            color: undefined,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="w-fit min-w-[130px]">
            <CardContent className="space-y-1 px-4 py-3">
              <div className="whitespace-nowrap text-sm text-muted-foreground">
                {kpi.label}
              </div>
              <div className="flex items-end">
                <div
                  className="min-w-0 text-xl font-semibold leading-none tracking-tight"
                  style={kpi.color ? { color: kpi.color } : undefined}
                >
                  {kpi.value}
                </div>
              </div>
              {kpi.change !== null && dashTotals.ca > 0 ? (
                <div className="flex items-center gap-1 text-xs">
                  {kpi.change >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                  )}
                  <span className={kpi.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {pctFmt.format(Math.abs(kpi.change))}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        <Card>
          <Tabs defaultValue="line" className="space-y-3">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Évolution du CA (N vs N-1)</CardTitle>
              <TabsList className="h-auto w-fit flex-wrap justify-start">
                <TabsTrigger value="line">Courbe</TabsTrigger>
                <TabsTrigger value="columns">Colonnes</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="line" className="mt-0">
                <div className="relative w-full overflow-x-auto rounded-md border p-3">
                  {hoveredTrend && (
                    <div className="absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm md:text-base shadow-sm">
                      <div className="font-medium">
                        {dashScope === "year"
                          ? `${hoveredTrend.label} ${dashYearLabel}`
                          : dashScope === "week"
                            ? `${hoveredTrend.label} - S${dashWeek} ${dashYearLabel}`
                          : dashScope === "month"
                            ? `Jour ${hoveredTrend.label} - ${monthLabel} ${dashYearLabel}`
                            : `${hoveredTrend.label}/${dashMonthLabel}/${dashYearLabel}`}
                      </div>
                      <div className="text-muted-foreground">
                        N: <span className="font-semibold text-foreground">{moneyFmt.format(hoveredTrend.n)}</span>
                      </div>
                      <div className="text-muted-foreground">
                        N-1: <span className="font-semibold text-foreground">{moneyFmt.format(hoveredTrend.n1)}</span>
                      </div>
                      {normalizeComment(dashTrend.commentsN?.[hoveredTrend.idx] ?? null) && (
                        <div className="text-muted-foreground">
                          Com. N:{" "}
                          <span
                            className="inline-block max-w-[240px] truncate align-bottom text-foreground"
                            title={normalizeComment(dashTrend.commentsN?.[hoveredTrend.idx] ?? null) ?? ""}
                          >
                            {truncateComment(normalizeComment(dashTrend.commentsN?.[hoveredTrend.idx] ?? null) ?? "")}
                          </span>
                        </div>
                      )}
                      {normalizeComment(dashTrend.commentsN1?.[hoveredTrend.idx] ?? null) && (
                        <div className="text-muted-foreground">
                          Com. N-1:{" "}
                          <span
                            className="inline-block max-w-[240px] truncate align-bottom text-foreground"
                            title={normalizeComment(dashTrend.commentsN1?.[hoveredTrend.idx] ?? null) ?? ""}
                          >
                            {truncateComment(normalizeComment(dashTrend.commentsN1?.[hoveredTrend.idx] ?? null) ?? "")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <svg
                    viewBox={`0 0 ${trendChart.chartWidth} ${trendChart.chartHeight}`}
                    className="h-[300px] min-w-[920px] w-full"
                    onMouseLeave={() => setHoveredTrendIndex(null)}
                  >
                    <rect x="0" y="0" width={trendChart.chartWidth} height={trendChart.chartHeight} fill="transparent" />
                    <line
                      x1={trendChart.padLeft}
                      x2={trendChart.padLeft}
                      y1={trendChart.padTop}
                      y2={trendChart.padTop + trendChart.h}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                    />
                    <line
                      x1={trendChart.padLeft}
                      x2={trendChart.padLeft + trendChart.w}
                      y1={trendChart.padTop + trendChart.h}
                      y2={trendChart.padTop + trendChart.h}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                    />
                    {trendChart.yTicks.map((tick) => (
                      <g key={`y-${tick.ratio}`}>
                        <line
                          x1={trendChart.padLeft}
                          x2={trendChart.padLeft + trendChart.w}
                          y1={tick.y}
                          y2={tick.y}
                          stroke="currentColor"
                          className="text-muted/40"
                          strokeWidth="1"
                        />
                        <text
                          x={trendChart.padLeft - 10}
                          y={tick.y + 5}
                          textAnchor="end"
                          className="fill-muted-foreground"
                          fontSize="13"
                        >
                          {tick.value}
                        </text>
                      </g>
                    ))}
                    {dashTrend.labels.map((label, idx) => {
                      const point = trendChart.nPoints[idx];
                      if (!point) return null;
                      return (
                        <text
                          key={`x-all-${idx}`}
                          x={point.x}
                          y={trendChart.padTop + trendChart.h + 20}
                          textAnchor="middle"
                          className="fill-muted-foreground"
                          fontSize="13"
                        >
                          {label}
                        </text>
                      );
                    })}
                    <text
                      x={trendChart.padLeft - 24}
                      y={trendChart.padTop - 10}
                      className="fill-muted-foreground"
                      fontSize="13"
                    >
                      CA (EUR)
                    </text>
                    <text
                      x={trendChart.padLeft + trendChart.w / 2}
                      y={trendChart.chartHeight - 1}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize="13"
                    >
                      {dashScope === "year" ? "Mois" : "Jours"}
                    </text>
                    {hoveredTrend && (
                      <line
                        x1={hoveredTrend.nPoint.x}
                        x2={hoveredTrend.nPoint.x}
                        y1={trendChart.padTop}
                        y2={trendChart.padTop + trendChart.h}
                        stroke="currentColor"
                        className="text-muted-foreground/40"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                    )}
                    <polyline
                      points={trendChart.n1Line}
                      fill="none"
                      stroke="currentColor"
                      className="text-muted-foreground"
                      strokeDasharray="4 4"
                      strokeWidth="2"
                    />
                    <polyline
                      points={trendChart.nLine}
                      fill="none"
                      stroke="currentColor"
                      className="text-primary"
                      strokeWidth="3"
                    />
                    {hoveredTrend && (
                      <>
                        <circle cx={hoveredTrend.nPoint.x} cy={hoveredTrend.nPoint.y} r="4" className="fill-primary" />
                        <circle cx={hoveredTrend.n1Point.x} cy={hoveredTrend.n1Point.y} r="4" className="fill-muted-foreground" />
                      </>
                    )}
                    {dashTrend.labels.map((_, idx) => {
                      const point = trendChart.nPoints[idx];
                      if (!point) return null;
                      const step =
                        dashTrend.labels.length <= 1
                          ? trendChart.w
                          : trendChart.w / Math.max(1, dashTrend.labels.length - 1);
                      return (
                        <rect
                          key={`hover-zone-${idx}`}
                          x={Math.max(trendChart.padLeft, point.x - step / 2)}
                          y={trendChart.padTop}
                          width={Math.max(6, step)}
                          height={trendChart.h}
                          fill="transparent"
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                        />
                      );
                    })}
                  </svg>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Évolution du CA N
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Évolution du CA N-1
                  </span>
                </div>
              </TabsContent>
              <TabsContent value="columns" className="mt-0">
                <div
                  className="relative w-full overflow-x-auto rounded-md border p-3"
                  style={dashScope === "month" ? { maxWidth: "73vw" } : undefined}
                >
                  {hoveredRevenueColumnIndex !== null && (
                    <div className="absolute right-3 top-3 z-10 w-fit rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm">
                    <div className="font-medium">
                      {dashScope === "year"
                        ? `${dashTrend.labels[hoveredRevenueColumnIndex]} ${dashYearLabel}`
                        : dashScope === "week"
                          ? `${dashTrend.labels[hoveredRevenueColumnIndex]} - S${dashWeek} ${dashYearLabel}`
                        : dashScope === "month"
                          ? `Jour ${dashTrend.labels[hoveredRevenueColumnIndex]} - ${monthLabel} ${dashYearLabel}`
                          : `${dashTrend.labels[hoveredRevenueColumnIndex]}/${dashMonthLabel}/${dashYearLabel}`}
                      </div>
                      <div className="text-muted-foreground">
                        Évolution du CA N:{" "}
                        <span className="font-semibold text-foreground">
                          {moneyFmt.format(dashTrend.n[hoveredRevenueColumnIndex] ?? 0)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Évolution du CA N-1:{" "}
                        <span className="font-semibold text-foreground">
                          {moneyFmt.format(dashTrend.n1[hoveredRevenueColumnIndex] ?? 0)}
                        </span>
                      </div>
                      {normalizeComment(dashTrend.commentsN?.[hoveredRevenueColumnIndex] ?? null) && (
                        <div className="text-muted-foreground">
                          Com. N:{" "}
                          <span
                            className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                            title={normalizeComment(dashTrend.commentsN?.[hoveredRevenueColumnIndex] ?? null) ?? ""}
                          >
                            {truncateComment(normalizeComment(dashTrend.commentsN?.[hoveredRevenueColumnIndex] ?? null) ?? "")}
                          </span>
                        </div>
                      )}
                      {normalizeComment(dashTrend.commentsN1?.[hoveredRevenueColumnIndex] ?? null) && (
                        <div className="text-muted-foreground">
                          Com. N-1:{" "}
                          <span
                            className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                            title={normalizeComment(dashTrend.commentsN1?.[hoveredRevenueColumnIndex] ?? null) ?? ""}
                          >
                            {truncateComment(normalizeComment(dashTrend.commentsN1?.[hoveredRevenueColumnIndex] ?? null) ?? "")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                <div
                  className={`h-[360px] flex items-end ${revenueColumnGapClass} ${
                    dashScope === "month" ? "w-max" : "w-full justify-between"
                  }`}
                  style={dashScope === "month" ? { minWidth: `${revenueChartMinWidth}px` } : undefined}
                  onMouseLeave={() => setHoveredRevenueColumnIndex(null)}
                >
                  {dashTrend.labels.map((label, idx) => {
                      const n = dashTrend.n[idx] ?? 0;
                      const n1 = dashTrend.n1[idx] ?? 0;
                      const max = Math.max(...dashTrend.n, ...dashTrend.n1, 1);
                      const nHeight = Math.max(3, Math.round((n / max) * 300));
                      const n1Height = Math.max(3, Math.round((n1 / max) * 300));
                    return (
                      <div
                        key={`col-${label}-${idx}`}
                        className={`${revenueColumnWidthClass} shrink-0 flex flex-col items-center gap-2`}
                      >
                        <div className={`h-[300px] w-full flex items-end justify-center ${revenuePairGapClass}`}>
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-foreground whitespace-nowrap">
                                  {compactMoneyFmt.format(n)}
                                </span>
                              )}
                              <div
                                className="w-4 rounded-t bg-primary/85 cursor-pointer"
                                style={{ height: `${nHeight}px` }}
                                title={`N ${label}: ${moneyFmt.format(n)}`}
                                onMouseEnter={() => setHoveredRevenueColumnIndex(idx)}
                              />
                            </div>
                            <div className="w-4 flex flex-col items-center justify-end">
                              {n1 > 0 && (
                                <span className="mb-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                  {compactMoneyFmt.format(n1)}
                                </span>
                              )}
                              <div
                                className="w-4 rounded-t bg-muted-foreground/75 cursor-pointer"
                                style={{ height: `${n1Height}px` }}
                                title={`N-1 ${label}: ${moneyFmt.format(n1)}`}
                                onMouseEnter={() => setHoveredRevenueColumnIndex(idx)}
                              />
                            </div>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pointer-events-none absolute left-3 top-2 text-[11px] text-muted-foreground">
                    CA (EUR)
                  </div>
                  <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
                    {dashScope === "year" ? "Mois" : "Jours"}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/85" /> Évolution du CA N
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/75" /> Évolution du CA N-1
                  </span>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card>
          <Tabs defaultValue="line" className="space-y-3">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Répartition du CA par canal (N vs N-1)</CardTitle>
              <TabsList className="h-auto w-fit flex-wrap justify-start">
                <TabsTrigger value="line">Courbe</TabsTrigger>
                <TabsTrigger value="donut">Donut</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="line" className="mt-0">
                {(() => {
                  const labels = channelTrend.labels;
                  const allValues = channelTrend.series.flatMap((serie) => [...serie.n, ...serie.n1]);
                  const maxValue = Math.max(...allValues, 1);
                  const chartWidth = 980;
                  const chartHeight = 320;
                  const padLeft = 2;
                  const padRight = 2;
                  const padTop = 18;
                  const padBottom = 42;
                  const innerW = chartWidth - padLeft - padRight;
                  const innerH = chartHeight - padTop - padBottom;
                  const count = Math.max(labels.length, 1);
                  const stepX = count > 1 ? innerW / (count - 1) : 0;
                  const toPoint = (value: number, idx: number) => ({
                    x: padLeft + (count > 1 ? idx * stepX : innerW / 2),
                    y: padTop + innerH - (value / maxValue) * innerH,
                    value,
                    label: labels[idx] ?? "",
                  });
                  const yTicks = [0, 0.25, 0.5, 0.75, 1];
                  const maxXTicks = 9;
                  const xStride = Math.max(1, Math.ceil(labels.length / maxXTicks));
                  const xTickIndexes = Array.from({ length: labels.length }, (_, idx) => idx).filter(
                    (idx) => idx === 0 || idx === labels.length - 1 || idx % xStride === 0
                  );
                  const seriesWithPoints = channelTrend.series.map((serie) => {
                    const nPoints = serie.n.map(toPoint);
                    const n1Points = serie.n1.map(toPoint);
                    return {
                      ...serie,
                      nPoints,
                      n1Points,
                      nPolyline: nPoints.map((point) => `${point.x},${point.y}`).join(" "),
                      n1Polyline: n1Points.map((point) => `${point.x},${point.y}`).join(" "),
                    };
                  });
                  const hoveredLabel =
                    hoveredChannelLineIndex !== null ? labels[hoveredChannelLineIndex] ?? "" : null;
                  const hoveredX =
                    hoveredChannelLineIndex !== null
                      ? padLeft + (count > 1 ? hoveredChannelLineIndex * stepX : innerW / 2)
                      : null;

                  return (
                    <div className="space-y-3">
                      <div className="relative overflow-x-auto rounded-md border p-3">
                        {hoveredChannelLineIndex !== null && hoveredLabel && (
                          <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm">
                            <div className="mb-1 font-medium text-foreground">{hoveredLabel}</div>
                            {channelTrend.series.map((serie) => (
                              <div key={`tooltip-${serie.key}`} className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.color }} />
                                <span className="text-muted-foreground">
                                  {serie.label}:{" "}
                                  <span className="font-semibold" style={{ color: serie.color }}>
                                    {compactMoneyFmt.format(serie.n[hoveredChannelLineIndex] ?? 0)}
                                  </span>{" "}
                                  /{" "}
                                  <span className="font-semibold" style={{ color: serie.color, opacity: 0.65 }}>
                                    {compactMoneyFmt.format(serie.n1[hoveredChannelLineIndex] ?? 0)}
                                  </span>
                                </span>
                              </div>
                            ))}
                            {normalizeComment(channelTrend.commentsN?.[hoveredChannelLineIndex] ?? null) && (
                              <div className="mt-1 text-muted-foreground">
                                Com. N:{" "}
                                <span
                                  className="inline-block max-w-[280px] truncate align-bottom text-foreground"
                                  title={normalizeComment(channelTrend.commentsN?.[hoveredChannelLineIndex] ?? null) ?? ""}
                                >
                                  {truncateComment(normalizeComment(channelTrend.commentsN?.[hoveredChannelLineIndex] ?? null) ?? "", 58)}
                                </span>
                              </div>
                            )}
                            {normalizeComment(channelTrend.commentsN1?.[hoveredChannelLineIndex] ?? null) && (
                              <div className="text-muted-foreground">
                                Com. N-1:{" "}
                                <span
                                  className="inline-block max-w-[280px] truncate align-bottom text-foreground"
                                  title={normalizeComment(channelTrend.commentsN1?.[hoveredChannelLineIndex] ?? null) ?? ""}
                                >
                                  {truncateComment(normalizeComment(channelTrend.commentsN1?.[hoveredChannelLineIndex] ?? null) ?? "", 58)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        <svg
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          className="h-[300px] min-w-[920px] w-full"
                          onMouseLeave={() => setHoveredChannelLineIndex(null)}
                        >
                          <line
                            x1={padLeft}
                            y1={padTop + innerH}
                            x2={padLeft + innerW}
                            y2={padTop + innerH}
                            className="text-border"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <line
                            x1={padLeft}
                            y1={padTop}
                            x2={padLeft}
                            y2={padTop + innerH}
                            className="text-border"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          {yTicks.map((tick) => {
                            const y = padTop + innerH - tick * innerH;
                            return (
                              <g key={`channel-y-${tick}`}>
                                <line
                                  x1={padLeft}
                                  y1={y}
                                  x2={padLeft + innerW}
                                  y2={y}
                                  className="text-muted/35"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                />
                                <text x={padLeft - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="12">
                                  {compactMoneyFmt.format(maxValue * tick)}
                                </text>
                              </g>
                            );
                          })}
                          {xTickIndexes.map((idx) => {
                            const label = labels[idx] ?? "";
                            const x = padLeft + (count > 1 ? idx * stepX : innerW / 2);
                            return (
                              <text
                                key={`channel-x-${idx}`}
                                x={x}
                                y={chartHeight - 10}
                                textAnchor="middle"
                                className="fill-muted-foreground"
                                fontSize="12"
                              >
                                {label}
                              </text>
                            );
                          })}
                          {hoveredX !== null && (
                            <line
                              x1={hoveredX}
                              x2={hoveredX}
                              y1={padTop}
                              y2={padTop + innerH}
                              stroke="currentColor"
                              className="text-muted-foreground/40"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                          )}
                          {seriesWithPoints.map((serie) => (
                            <g key={`serie-${serie.key}-n1`}>
                              <polyline
                                points={serie.n1Polyline}
                                fill="none"
                                stroke={serie.color}
                                strokeOpacity="0.35"
                                strokeWidth="2"
                              />
                              {serie.n1Points.map((point, idx) => (
                                <circle
                                  key={`pt-${serie.key}-n1-${idx}`}
                                  cx={point.x}
                                  cy={point.y}
                                  r="3"
                                  fill={serie.color}
                                  fillOpacity="0.35"
                                />
                              ))}
                            </g>
                          ))}
                          {seriesWithPoints.map((serie) => (
                            <g key={`serie-${serie.key}-n`}>
                              <polyline points={serie.nPolyline} fill="none" stroke={serie.color} strokeWidth="2.5" />
                              {serie.nPoints.map((point, idx) => (
                                <circle key={`pt-${serie.key}-n-${idx}`} cx={point.x} cy={point.y} r="3.2" fill={serie.color} />
                              ))}
                            </g>
                          ))}
                          {labels.map((_, idx) => {
                            const x = padLeft + (count > 1 ? idx * stepX : innerW / 2);
                            const zoneWidth = Math.max(10, stepX || innerW);
                            return (
                              <rect
                                key={`channel-hover-zone-${idx}`}
                                x={Math.max(padLeft, x - zoneWidth / 2)}
                                y={padTop}
                                width={zoneWidth}
                                height={innerH}
                                fill="transparent"
                                onMouseEnter={() => setHoveredChannelLineIndex(idx)}
                              />
                            );
                          })}
                        </svg>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                        {channelTrend.series.map((serie) => (
                          <span key={`legend-${serie.key}`} className="inline-flex items-center gap-2 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.color }} />
                            <span>{serie.label} (N)</span>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.color, opacity: 0.35 }} />
                            <span>{serie.label} (N-1)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>
              <TabsContent value="donut" className="mt-0">
                {(() => {
                  const totalN = channelBreakdown.reduce((sum, row) => sum + row.value, 0);
                  const totalN1 = channelBreakdownN1.reduce((sum, row) => sum + row.value, 0);
                  return (
                <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                  <div>
                    <div className="mb-2 text-sm font-medium text-muted-foreground">N</div>
                    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                      <div className="mx-auto relative h-56 w-56">
                        <svg viewBox="0 0 220 220" className="h-full w-full">
                          <g transform="translate(110,110) rotate(-90)">
                            {(() => {
                              const r = 72;
                              const c = 2 * Math.PI * r;
                              let offset = 0;
                              return channelBreakdown.map((row, idx) => {
                                const len = Math.max(0, row.share * c);
                                const seg = (
                                  <circle
                                    key={`seg-n-${row.label}`}
                                    r={r}
                                    cx={0}
                                    cy={0}
                                    fill="transparent"
                                    stroke={channelColors[idx % channelColors.length]}
                                    strokeWidth={28}
                                    strokeDasharray={`${len} ${Math.max(0, c - len)}`}
                                    strokeDashoffset={-offset}
                                    className="cursor-pointer transition-opacity"
                                    style={{ opacity: hoveredChannelIndex === null || hoveredChannelIndex === idx ? 1 : 0.45 }}
                                    onMouseEnter={() => setHoveredChannelIndex(idx)}
                                    onMouseLeave={() => setHoveredChannelIndex(null)}
                                  />
                                );
                                offset += len;
                                return seg;
                              });
                            })()}
                          </g>
                          {totalN === 0 && (
                            <circle r={72} cx={110} cy={110} fill="transparent" stroke="#cbd5e1" strokeWidth={28} />
                          )}
                          <circle cx="110" cy="110" r="52" fill="hsl(var(--background))" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                          {hoveredChannelIndex === null ? (
                            <div>
                              <div className="text-sm font-medium">Total CA</div>
                              <div className="text-xs text-muted-foreground">
                                100% •{" "}
                                <span className="font-semibold text-foreground">{compactMoneyFmt.format(dashTotals.ca)}</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                className="text-sm font-medium"
                                style={{ color: channelColors[hoveredChannelIndex % channelColors.length] }}
                              >
                                {channelBreakdown[hoveredChannelIndex]?.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pctFmt.format(channelBreakdown[hoveredChannelIndex]?.share ?? 0)} •{" "}
                                <span className="font-semibold text-foreground">
                                  {compactMoneyFmt.format(channelBreakdown[hoveredChannelIndex]?.value ?? 0)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {channelBreakdown.map((row, idx) => (
                          <div
                            key={`n-side-${row.label}`}
                            className="rounded-md border p-2 text-sm cursor-pointer"
                            style={{ opacity: hoveredChannelIndex === null || hoveredChannelIndex === idx ? 1 : 0.55 }}
                            onMouseEnter={() => setHoveredChannelIndex(idx)}
                            onMouseLeave={() => setHoveredChannelIndex(null)}
                          >
                            <div className="font-medium" style={{ color: channelColors[idx % channelColors.length] }}>
                              {row.label}
                            </div>
                            <div className="text-muted-foreground">
                              {pctFmt.format(row.share)} • <span className="font-semibold">{compactMoneyFmt.format(row.value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="relative hidden lg:block w-px self-stretch bg-border/70" aria-hidden="true">
                    <div className="absolute top-[65px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-10">
                      {channelBreakdown.map((row, idx) => {
                        const change = pctChange(row.share, channelBreakdownN1[idx]?.share ?? 0);
                        const isHovered = hoveredChannelIndex === null || hoveredChannelIndex === idx;
                        if (change === null) {
                          return (
                            <div
                              key={`divider-delta-${row.label}`}
                              className="rounded bg-background px-2 py-1 text-xs text-muted-foreground"
                              style={{ opacity: isHovered ? 1 : 0.35 }}
                            >
                              —
                            </div>
                          );
                        }
                        const isUp = change >= 0;
                        return (
                          <div
                            key={`divider-delta-${row.label}`}
                            className="flex items-center gap-1 rounded bg-background py-1 text-xs"
                            style={{ opacity: isHovered ? 1 : 0.35 }}
                          >
                            {isUp ? (
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                            )}
                            <span className={isUp ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                              {pctFmt.format(Math.abs(change))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-sm font-medium text-muted-foreground">N-1</div>
                    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="space-y-2">
                        {channelBreakdownN1.map((row, idx) => (
                          <div
                            key={`n1-side-${row.label}`}
                            className="rounded-md border p-2 text-sm cursor-pointer text-right"
                            style={{ opacity: hoveredChannelIndex === null || hoveredChannelIndex === idx ? 1 : 0.55 }}
                            onMouseEnter={() => setHoveredChannelIndex(idx)}
                            onMouseLeave={() => setHoveredChannelIndex(null)}
                          >
                            <div className="font-medium" style={{ color: channelColors[idx % channelColors.length] }}>
                              {row.label}
                            </div>
                            <div className="text-muted-foreground">
                              {pctFmt.format(row.share)} • <span className="font-semibold">{compactMoneyFmt.format(row.value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mx-auto relative h-56 w-56">
                        <svg viewBox="0 0 220 220" className="h-full w-full">
                          <g transform="translate(110,110) rotate(-90)">
                            {(() => {
                              const r = 72;
                              const c = 2 * Math.PI * r;
                              let offset = 0;
                              return channelBreakdownN1.map((row, idx) => {
                                const len = Math.max(0, row.share * c);
                                const seg = (
                                  <circle
                                    key={`seg-n1-${row.label}`}
                                    r={r}
                                    cx={0}
                                    cy={0}
                                    fill="transparent"
                                    stroke={channelColors[idx % channelColors.length]}
                                    strokeWidth={28}
                                    strokeDasharray={`${len} ${Math.max(0, c - len)}`}
                                    strokeDashoffset={-offset}
                                    className="cursor-pointer transition-opacity"
                                    style={{ opacity: hoveredChannelIndex === null || hoveredChannelIndex === idx ? 1 : 0.45 }}
                                    onMouseEnter={() => setHoveredChannelIndex(idx)}
                                    onMouseLeave={() => setHoveredChannelIndex(null)}
                                  />
                                );
                                offset += len;
                                return seg;
                              });
                            })()}
                          </g>
                          {totalN1 === 0 && (
                            <circle r={72} cx={110} cy={110} fill="transparent" stroke="#cbd5e1" strokeWidth={28} />
                          )}
                          <circle cx="110" cy="110" r="52" fill="hsl(var(--background))" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                          {hoveredChannelIndex === null ? (
                            <div>
                              <div className="text-sm font-medium">Total CA N-1</div>
                              <div className="text-xs text-muted-foreground">
                                100% •{" "}
                                <span className="font-semibold text-foreground">
                                  {compactMoneyFmt.format(channelBreakdownN1.reduce((sum, row) => sum + row.value, 0))}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                className="text-sm font-medium"
                                style={{ color: channelColors[hoveredChannelIndex % channelColors.length] }}
                              >
                                {channelBreakdownN1[hoveredChannelIndex]?.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pctFmt.format(channelBreakdownN1[hoveredChannelIndex]?.share ?? 0)} •{" "}
                                <span className="font-semibold text-foreground">
                                  {compactMoneyFmt.format(channelBreakdownN1[hoveredChannelIndex]?.value ?? 0)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                  );
                })()}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      <Card>
        <Tabs defaultValue="sales" className="space-y-3">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Ventes et panier moyen (N vs N-1)</CardTitle>
            <TabsList className="h-auto w-fit flex-wrap justify-start">
              <TabsTrigger value="sales">Ventes</TabsTrigger>
              <TabsTrigger value="basket">Panier moyen</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="sales" className="mt-0">
              <div className="relative overflow-x-auto rounded-md border p-3">
                {hoveredSalesColumnIndex !== null && (
                  <div className="absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm">
                    <div className="font-medium">
                      {dashScope === "year"
                        ? `${salesTrend.labels[hoveredSalesColumnIndex]} ${dashYearLabel}`
                        : dashScope === "week"
                          ? `${salesTrend.labels[hoveredSalesColumnIndex]} - S${dashWeek} ${dashYearLabel}`
                        : dashScope === "month"
                          ? `Jour ${salesTrend.labels[hoveredSalesColumnIndex]} - ${monthLabel} ${dashYearLabel}`
                          : `${salesTrend.labels[hoveredSalesColumnIndex]}/${dashMonthLabel}/${dashYearLabel}`}
                    </div>
                    <div className="text-muted-foreground">
                      Ventes N:{" "}
                      <span className="font-semibold text-foreground">
                        {(salesTrend.n[hoveredSalesColumnIndex] ?? 0) === 0
                          ? "—"
                          : intFmt.format(salesTrend.n[hoveredSalesColumnIndex] ?? 0)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Ventes N-1:{" "}
                      <span className="font-semibold text-foreground">
                        {(salesTrend.n1[hoveredSalesColumnIndex] ?? 0) === 0
                          ? "—"
                          : intFmt.format(salesTrend.n1[hoveredSalesColumnIndex] ?? 0)}
                      </span>
                    </div>
                    {normalizeComment(salesTrend.commentsN?.[hoveredSalesColumnIndex] ?? null) && (
                      <div className="text-muted-foreground">
                        Com. N:{" "}
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                          title={normalizeComment(salesTrend.commentsN?.[hoveredSalesColumnIndex] ?? null) ?? ""}
                        >
                          {truncateComment(normalizeComment(salesTrend.commentsN?.[hoveredSalesColumnIndex] ?? null) ?? "")}
                        </span>
                      </div>
                    )}
                    {normalizeComment(salesTrend.commentsN1?.[hoveredSalesColumnIndex] ?? null) && (
                      <div className="text-muted-foreground">
                        Com. N-1:{" "}
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                          title={normalizeComment(salesTrend.commentsN1?.[hoveredSalesColumnIndex] ?? null) ?? ""}
                        >
                          {truncateComment(normalizeComment(salesTrend.commentsN1?.[hoveredSalesColumnIndex] ?? null) ?? "")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`h-[360px] flex items-end ${metricColumnGapClass} ${
                    dashScope === "month" ? "w-max" : "w-full justify-between"
                  }`}
                  style={dashScope === "month" ? { minWidth: `${metricChartMinWidth}px` } : undefined}
                  onMouseLeave={() => setHoveredSalesColumnIndex(null)}
                >
                  {salesTrend.labels.map((label, idx) => {
                    const n = salesTrend.n[idx] ?? 0;
                    const n1 = salesTrend.n1[idx] ?? 0;
                    const max = Math.max(...salesTrend.n, ...salesTrend.n1, 1);
                    const nHeight = Math.max(8, Math.round((n / max) * 300));
                    const n1Height = Math.max(8, Math.round((n1 / max) * 300));
                    return (
                      <div
                        key={`sales-col-${label}-${idx}`}
                        className={`${metricColumnWidthClass} flex flex-col items-center gap-2`}
                        onMouseEnter={() => setHoveredSalesColumnIndex(idx)}
                      >
                        <div className="h-[300px] w-full flex items-end justify-center gap-2">
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-foreground whitespace-nowrap">
                                {intFmt.format(n)}
                              </span>
                            )}
                            <div
                              className="w-4 rounded-t bg-primary/85 cursor-pointer"
                              style={{ height: `${nHeight}px` }}
                              title={`Ventes N ${label}: ${intFmt.format(n)}`}
                            />
                          </div>
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n1 > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                {intFmt.format(n1)}
                              </span>
                            )}
                            <div
                              className="w-4 rounded-t bg-muted-foreground/75 cursor-pointer"
                              style={{ height: `${n1Height}px` }}
                              title={`Ventes N-1 ${label}: ${intFmt.format(n1)}`}
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute left-3 top-2 text-[11px] text-muted-foreground">
                  Ventes
                </div>
                <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
                  {dashScope === "year" ? "Mois" : "Jours"}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/85" /> Ventes N
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/75" /> Ventes N-1
                </span>
              </div>
            </TabsContent>
            <TabsContent value="basket" className="mt-0">
              <div className="relative overflow-x-auto rounded-md border p-3">
                {hoveredBasketColumnIndex !== null && (
                  <div className="absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm">
                    <div className="font-medium">
                      {dashScope === "year"
                        ? `${basketTrend.labels[hoveredBasketColumnIndex]} ${dashYearLabel}`
                        : dashScope === "week"
                          ? `${basketTrend.labels[hoveredBasketColumnIndex]} - S${dashWeek} ${dashYearLabel}`
                        : dashScope === "month"
                          ? `Jour ${basketTrend.labels[hoveredBasketColumnIndex]} - ${monthLabel} ${dashYearLabel}`
                          : `${basketTrend.labels[hoveredBasketColumnIndex]}/${dashMonthLabel}/${dashYearLabel}`}
                    </div>
                    <div className="text-muted-foreground">
                      Panier moyen N:{" "}
                      <span className="font-semibold text-foreground">
                        {(basketTrend.n[hoveredBasketColumnIndex] ?? 0) === 0
                          ? "—"
                          : moneyFmt.format(basketTrend.n[hoveredBasketColumnIndex] ?? 0)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Panier moyen N-1:{" "}
                      <span className="font-semibold text-foreground">
                        {(basketTrend.n1[hoveredBasketColumnIndex] ?? 0) === 0
                          ? "—"
                          : moneyFmt.format(basketTrend.n1[hoveredBasketColumnIndex] ?? 0)}
                      </span>
                    </div>
                    {normalizeComment(basketTrend.commentsN?.[hoveredBasketColumnIndex] ?? null) && (
                      <div className="text-muted-foreground">
                        Com. N:{" "}
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                          title={normalizeComment(basketTrend.commentsN?.[hoveredBasketColumnIndex] ?? null) ?? ""}
                        >
                          {truncateComment(normalizeComment(basketTrend.commentsN?.[hoveredBasketColumnIndex] ?? null) ?? "")}
                        </span>
                      </div>
                    )}
                    {normalizeComment(basketTrend.commentsN1?.[hoveredBasketColumnIndex] ?? null) && (
                      <div className="text-muted-foreground">
                        Com. N-1:{" "}
                        <span
                          className="inline-block max-w-[260px] truncate align-bottom text-foreground"
                          title={normalizeComment(basketTrend.commentsN1?.[hoveredBasketColumnIndex] ?? null) ?? ""}
                        >
                          {truncateComment(normalizeComment(basketTrend.commentsN1?.[hoveredBasketColumnIndex] ?? null) ?? "")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`h-[360px] flex items-end ${metricColumnGapClass} ${
                    dashScope === "month" ? "w-max" : "w-full justify-between"
                  }`}
                  style={dashScope === "month" ? { minWidth: `${metricChartMinWidth}px` } : undefined}
                  onMouseLeave={() => setHoveredBasketColumnIndex(null)}
                >
                  {basketTrend.labels.map((label, idx) => {
                    const n = basketTrend.n[idx] ?? 0;
                    const n1 = basketTrend.n1[idx] ?? 0;
                    const max = Math.max(...basketTrend.n, ...basketTrend.n1, 1);
                    const nHeight = Math.max(8, Math.round((n / max) * 300));
                    const n1Height = Math.max(8, Math.round((n1 / max) * 300));
                    return (
                      <div
                        key={`basket-col-${label}-${idx}`}
                        className={`${metricColumnWidthClass} flex flex-col items-center gap-2`}
                        onMouseEnter={() => setHoveredBasketColumnIndex(idx)}
                      >
                        <div className="h-[300px] w-full flex items-end justify-center gap-2">
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-foreground whitespace-nowrap">
                                {n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                              </span>
                            )}
                            <div
                              className="w-4 rounded-t bg-primary/85 cursor-pointer"
                              style={{ height: `${nHeight}px` }}
                              title={`Panier moyen N ${label}: ${moneyFmt.format(n)}`}
                            />
                          </div>
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n1 > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                {n1.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                              </span>
                            )}
                            <div
                              className="w-4 rounded-t bg-muted-foreground/75 cursor-pointer"
                              style={{ height: `${n1Height}px` }}
                              title={`Panier moyen N-1 ${label}: ${moneyFmt.format(n1)}`}
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute left-3 top-2 text-[11px] text-muted-foreground">
                  Panier moyen (EUR)
                </div>
                <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
                  {dashScope === "year" ? "Mois" : "Jours"}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/85" /> Panier moyen N
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/75" /> Panier moyen N-1
                </span>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base mb-3">Vue rapide magasins - {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleStoreQuickView.map((store) => {
            const change = pctChange(store.ca, store.caN1);
            const mp = store.clients ? store.ca / store.clients : 0;
            return (
              <div key={store.code} className="rounded-lg border bg-background p-6 space-y-3 min-h-[150px]">
                <div className="text-base font-semibold">
                  {store.code} - {store.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>CA : {compactMoneyFmt.format(store.ca)}</span>
                  {change !== null && Math.abs(change) > 0 && (
                    <span className={change >= 0 ? "inline-flex items-center gap-1 text-emerald-600" : "inline-flex items-center gap-1 text-red-600"}>
                      {change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {pctFmt.format(Math.abs(change))} vs N-1
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">Clients : {intFmt.format(store.clients)}</div>
                <div className="text-sm text-muted-foreground">Panier moyen : {moneyFmt.format(mp)}</div>
              </div>
            );
          })}
          {visibleStoreQuickView.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun restaurant disponible.</div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
