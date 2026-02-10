import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyImportBanner } from "@/components/dashboard/DailyImportBanner";

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

export function DashboardOverview({
  canSeeDailyBanner,
  dailyStatus,
  onImportNow,
  dashScope,
  setDashScope,
  yearOptions,
  dashYear,
  setDashYear,
  dashMonth,
  setDashMonth,
  dashDayFrom,
  setDashDayFrom,
  dashDayTo,
  setDashDayTo,
  dayOptions,
  dayToOptions,
  restaurants,
  dashRestaurant,
  setDashRestaurant,
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
  channelMax,
  salesTrend,
  basketTrend,
  storeQuickView,
}: Props) {
  const [hoveredChannelIndex, setHoveredChannelIndex] = useState<number | null>(null);
  const [hoveredRevenueColumnIndex, setHoveredRevenueColumnIndex] = useState<number | null>(null);
  const [hoveredSalesColumnIndex, setHoveredSalesColumnIndex] = useState<number | null>(null);
  const [hoveredBasketColumnIndex, setHoveredBasketColumnIndex] = useState<number | null>(null);
  const channelColors = ["#0f172a", "#0ea5e9", "#f59e0b"];

  return (
    <TabsContent value="overview" className="space-y-4">
      <DailyImportBanner visible={canSeeDailyBanner} status={dailyStatus} onImportNow={onImportNow} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="w-full space-y-1 sm:w-[130px]">
            <div className="text-sm md:text-base text-muted-foreground">Période</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
              value={dashScope}
              onChange={(e) => setDashScope(e.target.value as DashScope)}
            >
              <option value="year">Année</option>
              <option value="month">Mois</option>
              <option value="day">Jour</option>
            </select>
          </div>
          <div className="w-full space-y-1 sm:w-[110px]">
            <div className="text-sm md:text-base text-muted-foreground">Année</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
              value={dashYear}
              onChange={(e) => setDashYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          {dashScope !== "year" && (
            <div className="w-full space-y-1 sm:w-[160px]">
              <div className="text-sm md:text-base text-muted-foreground">Mois</div>
              <select
                className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
                value={dashMonth}
                onChange={(e) => setDashMonth(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const label = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
                    new Date(2000, i, 1)
                  );
                  const value = String(i + 1).padStart(2, "0");
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {dashScope === "day" && (
            <div className="w-full space-y-1 sm:w-[95px]">
              <div className="text-sm md:text-base text-muted-foreground">Du</div>
              <select
                className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
                value={dashDayFrom}
                onChange={(e) => setDashDayFrom(e.target.value)}
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}
          {dashScope === "day" && (
            <div className="w-full space-y-1 sm:w-[95px]">
              <div className="text-sm md:text-base text-muted-foreground">Au</div>
              <select
                className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
                value={dashDayTo}
                onChange={(e) => setDashDayTo(e.target.value)}
              >
                {dayToOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="w-full space-y-1 sm:w-[220px]">
            <div className="text-sm md:text-base text-muted-foreground">Restaurant</div>
            <select
              className="h-10 w-full rounded-md border bg-background px-2 py-1 text-sm md:text-base"
              value={dashRestaurant}
              onChange={(e) => setDashRestaurant(e.target.value)}
            >
              <option value="">Tous les magasins</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>
          {dashErr && <div className="w-full text-sm text-destructive">{dashErr}</div>}
          {dashLoading && (
            <div className="w-full text-sm md:text-base text-muted-foreground">
              Chargement du tableau de bord...
            </div>
          )}
          <div className="w-full text-sm md:text-base text-muted-foreground">{filtersSummary}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          {
            label: "Chiffre d'affaires",
            value: compactMoneyFmt.format(dashTotals.ca),
            change: pctChange(dashTotals.ca, dashTotals.caN1),
          },
          {
            label: "Nombre de ventes",
            value: intFmt.format(dashTotals.clients),
            change: pctChange(dashTotals.clients, dashTotals.clientsN1),
          },
          {
            label: "Panier moyen",
            value: moneyFmt.format(dashTotals.mp || 0),
            change: pctChange(dashTotals.mp, dashTotals.mpN1),
          },
          {
            label: "CA delivery",
            value: compactMoneyFmt.format(dashTotals.caDelivery),
            change: pctChange(dashTotals.caDelivery, 0),
          },
          {
            label: "CA Click & Collect",
            value: compactMoneyFmt.format(dashTotals.caCnc),
            change: pctChange(dashTotals.caCnc, 0),
          },
          {
            label: "CA Magasin",
            value: compactMoneyFmt.format(dashTotals.caMagasin),
            change: null,
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 space-y-2">
              <div className="text-sm md:text-base text-muted-foreground">{kpi.label}</div>
              <div className="text-2xl font-semibold">{kpi.value}</div>
              {kpi.change !== null && (
                <div className="flex items-center gap-1 text-sm md:text-base">
                  {kpi.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <span className={kpi.change >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {pctFmt.format(Math.abs(kpi.change))}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du CA (N vs N-1)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="line" className="space-y-3">
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="line">Courbe</TabsTrigger>
                <TabsTrigger value="columns">Colonnes N/N-1</TabsTrigger>
              </TabsList>
              <TabsContent value="line" className="mt-0">
                <div className="text-sm md:text-base text-muted-foreground mb-3">{periodLabel}</div>
                <div className="relative">
                  {hoveredTrend && (
                    <div className="absolute right-2 top-2 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm md:text-base shadow-sm">
                      <div className="font-medium">
                        {dashScope === "year"
                          ? `${hoveredTrend.label} ${dashYearLabel}`
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
                    </div>
                  )}
                  <svg
                    viewBox={`0 0 ${trendChart.chartWidth} ${trendChart.chartHeight}`}
                    className="w-full h-72"
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
                          x={trendChart.padLeft - 8}
                          y={tick.y + 4}
                          textAnchor="end"
                          className="fill-muted-foreground"
                          fontSize="11"
                        >
                          {tick.value}
                        </text>
                      </g>
                    ))}
                    {trendChart.xTicks.map((tick) => (
                      <text
                        key={`x-${tick.idx}`}
                        x={tick.x}
                        y={trendChart.padTop + trendChart.h + 16}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize="11"
                      >
                        {tick.label}
                      </text>
                    ))}
                    <text
                      x={6}
                      y={trendChart.padTop + trendChart.h / 2}
                      transform={`rotate(-90 6 ${trendChart.padTop + trendChart.h / 2})`}
                      className="fill-muted-foreground"
                      fontSize="11"
                    >
                      CA (EUR)
                    </text>
                    <text
                      x={trendChart.padLeft + trendChart.w / 2}
                      y={trendChart.chartHeight - 1}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize="11"
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
                <div className="text-sm md:text-base text-muted-foreground mb-3">{periodLabel}</div>
                <div className="relative overflow-x-auto rounded-md border p-3">
                  {hoveredRevenueColumnIndex !== null && (
                    <div className="absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm">
                      <div className="font-medium">
                        {dashScope === "year"
                          ? `${dashTrend.labels[hoveredRevenueColumnIndex]} ${dashYearLabel}`
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
                    </div>
                  )}
                  <div
                    className="h-[360px] min-w-[720px] flex items-end gap-2"
                    onMouseLeave={() => setHoveredRevenueColumnIndex(null)}
                  >
                    {dashTrend.labels.map((label, idx) => {
                      const n = dashTrend.n[idx] ?? 0;
                      const n1 = dashTrend.n1[idx] ?? 0;
                      const max = Math.max(...dashTrend.n, ...dashTrend.n1, 1);
                      const nHeight = Math.max(3, Math.round((n / max) * 300));
                      const n1Height = Math.max(3, Math.round((n1 / max) * 300));
                      return (
                        <div key={`col-${label}-${idx}`} className="w-12 shrink-0 flex flex-col items-center gap-2">
                          <div className="h-[300px] w-full flex items-end justify-center gap-1">
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
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[11px] text-muted-foreground">
                    CA (EUR)
                  </div>
                  <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
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
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition du CA par canal</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="bars" className="space-y-3">
              <TabsList className="h-auto flex-wrap justify-start">
                <TabsTrigger value="bars">Barres</TabsTrigger>
                <TabsTrigger value="donut">Donut</TabsTrigger>
              </TabsList>
              <TabsContent value="bars" className="mt-0">
                <div className="grid gap-3">
                  {channelBreakdown.map((row) => {
                    const width = Math.round((row.value / channelMax) * 100);
                    return (
                      <div key={row.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm md:text-base">
                          <span>{row.label}</span>
                          <span className="text-muted-foreground">{compactMoneyFmt.format(row.value)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full rounded-full bg-primary/70" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
                            <TabsContent value="donut" className="mt-0">
                <div className="grid gap-4 lg:grid-cols-[280px,1fr] lg:items-center">
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
                                key={`seg-${row.label}`}
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
                      <circle cx="110" cy="110" r="52" fill="hsl(var(--background))" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                      {hoveredChannelIndex === null ? (
                        <div>
                          <div className="text-sm font-medium">Total CA</div>
                          <div className="text-xs text-muted-foreground">
                            100% • <span className="font-semibold text-foreground">{compactMoneyFmt.format(dashTotals.ca)}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium">{channelBreakdown[hoveredChannelIndex]?.label}</div>
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
                      <div key={`channel-donut-${row.label}`} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: channelColors[idx % channelColors.length] }}
                          />
                          {row.label}
                        </span>
                        <span className="text-muted-foreground">
                          {pctFmt.format(row.share)} • {compactMoneyFmt.format(row.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {channelBreakdown.map((row) => (
                <div key={`channel-part-${row.label}`} className="rounded-lg border p-3 space-y-2">
                  <div className="text-sm text-muted-foreground">{row.label}</div>
                  <div className="text-xl font-semibold">{pctFmt.format(row.share)}</div>
                  <div className="text-sm text-muted-foreground">{compactMoneyFmt.format(row.value)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventes et panier moyen (N vs N-1)</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="space-y-3">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="sales">Ventes</TabsTrigger>
              <TabsTrigger value="basket">Panier moyen</TabsTrigger>
            </TabsList>
            <TabsContent value="sales" className="mt-0">
              <div className="relative overflow-x-auto rounded-md border p-3">
                {hoveredSalesColumnIndex !== null && (
                  <div className="absolute right-3 top-3 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm">
                    <div className="font-medium">
                      {dashScope === "year"
                        ? `${salesTrend.labels[hoveredSalesColumnIndex]} ${dashYearLabel}`
                        : dashScope === "month"
                          ? `Jour ${salesTrend.labels[hoveredSalesColumnIndex]} - ${monthLabel} ${dashYearLabel}`
                          : `${salesTrend.labels[hoveredSalesColumnIndex]}/${dashMonthLabel}/${dashYearLabel}`}
                    </div>
                    <div className="text-muted-foreground">
                      Ventes N: <span className="font-semibold text-foreground">{intFmt.format(salesTrend.n[hoveredSalesColumnIndex] ?? 0)}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Ventes N-1: <span className="font-semibold text-foreground">{intFmt.format(salesTrend.n1[hoveredSalesColumnIndex] ?? 0)}</span>
                    </div>
                  </div>
                )}
                <div
                  className="h-[360px] min-w-[720px] flex items-end gap-2"
                  onMouseLeave={() => setHoveredSalesColumnIndex(null)}
                >
                  {salesTrend.labels.map((label, idx) => {
                    const n = salesTrend.n[idx] ?? 0;
                    const n1 = salesTrend.n1[idx] ?? 0;
                    const max = Math.max(...salesTrend.n, ...salesTrend.n1, 1);
                    const nHeight = Math.max(3, Math.round((n / max) * 300));
                    const n1Height = Math.max(3, Math.round((n1 / max) * 300));
                    return (
                      <div key={`sales-col-${label}-${idx}`} className="w-12 shrink-0 flex flex-col items-center gap-2">
                        <div className="h-[300px] w-full flex items-end justify-center gap-1">
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
                              onMouseEnter={() => setHoveredSalesColumnIndex(idx)}
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
                              onMouseEnter={() => setHoveredSalesColumnIndex(idx)}
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[11px] text-muted-foreground">
                  Ventes
                </div>
                <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
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
                        : dashScope === "month"
                          ? `Jour ${basketTrend.labels[hoveredBasketColumnIndex]} - ${monthLabel} ${dashYearLabel}`
                          : `${basketTrend.labels[hoveredBasketColumnIndex]}/${dashMonthLabel}/${dashYearLabel}`}
                    </div>
                    <div className="text-muted-foreground">
                      Panier moyen N:{" "}
                      <span className="font-semibold text-foreground">
                        {moneyFmt.format(basketTrend.n[hoveredBasketColumnIndex] ?? 0)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Panier moyen N-1:{" "}
                      <span className="font-semibold text-foreground">
                        {moneyFmt.format(basketTrend.n1[hoveredBasketColumnIndex] ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
                <div
                  className="h-[360px] min-w-[720px] flex items-end gap-2"
                  onMouseLeave={() => setHoveredBasketColumnIndex(null)}
                >
                  {basketTrend.labels.map((label, idx) => {
                    const n = basketTrend.n[idx] ?? 0;
                    const n1 = basketTrend.n1[idx] ?? 0;
                    const max = Math.max(...basketTrend.n, ...basketTrend.n1, 1);
                    const nHeight = Math.max(3, Math.round((n / max) * 300));
                    const n1Height = Math.max(3, Math.round((n1 / max) * 300));
                    return (
                      <div key={`basket-col-${label}-${idx}`} className="w-12 shrink-0 flex flex-col items-center gap-2">
                        <div className="h-[300px] w-full flex items-end justify-center gap-1">
                          <div className="w-4 flex flex-col items-center justify-end">
                            {n > 0 && (
                              <span className="mb-1 text-[10px] font-medium text-foreground whitespace-nowrap">
                                {compactMoneyFmt.format(n)}
                              </span>
                            )}
                            <div
                              className="w-4 rounded-t bg-primary/85 cursor-pointer"
                              style={{ height: `${nHeight}px` }}
                              title={`Panier moyen N ${label}: ${moneyFmt.format(n)}`}
                              onMouseEnter={() => setHoveredBasketColumnIndex(idx)}
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
                              title={`Panier moyen N-1 ${label}: ${moneyFmt.format(n1)}`}
                              onMouseEnter={() => setHoveredBasketColumnIndex(idx)}
                            />
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{label}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 text-[11px] text-muted-foreground">
                  Panier moyen (EUR)
                </div>
                <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
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
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vue rapide magasins - {periodLabel}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {storeQuickView.map((store) => {
            const change = pctChange(store.ca, store.caN1);
            const mp = store.clients ? store.ca / store.clients : 0;
            return (
              <div key={store.code} className="rounded-lg border bg-background p-6 space-y-3 min-h-[150px]">
                <div className="text-base font-semibold">
                  {store.code} - {store.name}
                </div>
                <div className="text-sm text-muted-foreground">CA: {compactMoneyFmt.format(store.ca)}</div>
                <div className="text-sm text-muted-foreground">Clients: {intFmt.format(store.clients)}</div>
                <div className="text-sm text-muted-foreground">Panier: {moneyFmt.format(mp)}</div>
                {change !== null && (
                  <div className="flex items-center gap-1 text-xs">
                    {change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-600" />
                    )}
                    <span className={change >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {pctFmt.format(Math.abs(change))} vs N-1
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {storeQuickView.length === 0 && (
            <div className="text-sm text-muted-foreground">Aucun restaurant disponible.</div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}



