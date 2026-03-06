import { useCallback, useEffect, useMemo, useState } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { compactMoneyFmt, moneyFmt, pctFmt } from "@/components/dashboard/shell/constants";

type Restaurant = { id: number; code: string; name: string };

type BudgetRow = {
  id: number;
  restaurant_code: string;
  budget_date: string;
  ca_target: number;
};

type DailyReportItem = {
  restaurant_code: string;
  report_date: string;
  ca_net_total: number;
  kpi: { ca_real: number | null; n1_ht: number | null; prev_ht: number | null } | null;
};

type Props = {
  visible: boolean;
  restaurants: Restaurant[];
};

const selectClass = "h-9 rounded-md border bg-background px-3 py-2 text-sm w-full";
const DONUT_COLORS = ["#0f766e","#8b5cf6","#3b82f6","#f59e0b","#ef4444","#10b981","#f97316","#6366f1","#ec4899","#14b8a6"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function pct(a: number, b: number): number | null {
  if (!b) return null;
  return (a - b) / b;
}

function StatusBadge({ ecartPct }: { ecartPct: number | null }) {
  if (ecartPct === null) return <span className="text-muted-foreground">—</span>;
  if (ecartPct >= 0)
    return <span className="inline-flex items-center gap-1 text-green-600 font-medium">✓ +{(ecartPct * 100).toFixed(1)}%</span>;
  return <span className="inline-flex items-center gap-1 text-red-500 font-medium">✗ {(ecartPct * 100).toFixed(1)}%</span>;
}

export function BudgetPage({ visible, restaurants }: Props) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [scope, setScope] = useState<"month" | "year">("month");
  const [restaurant, setRestaurant] = useState("");

  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const [caItems, setCaItems] = useState<DailyReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 1, y, y + 1];
  }, []);

  const { dateFrom, dateTo } = useMemo(() => {
    const y = Number(year);
    const m = Number(month);
    if (scope === "year") {
      return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
    }
    const lastDay = new Date(y, m, 0).getDate();
    return {
      dateFrom: `${y}-${String(m).padStart(2, "0")}-01`,
      dateTo: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [year, month, scope]);

  const fetchData = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const budgetParams = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (restaurant) budgetParams.set("restaurant_code", restaurant);

      const [bRows, caResp] = await Promise.all([
        apiFetch<BudgetRow[]>(`/budget/?${budgetParams}`),
        scope === "year"
          ? fetchAllMonths(year, restaurant)
          : apiFetch<{ items: DailyReportItem[] }>(`/reports/bk/monthly?year=${year}&month=${month}${restaurant ? `&restaurant_code=${restaurant}` : ""}`).then((r) => r.items),
      ]);

      setBudgetRows(bRows);
      setCaItems(caResp as DailyReportItem[]);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, year, month, scope, restaurant]);

  useEffect(() => {
    if (!visible) return;
    fetchData();
  }, [visible, fetchData]);

  // ── Aggregation ──────────────────────────────────────────────────────────────

  type AggRow = {
    key: string;
    label: string;
    caReal: number;
    n1: number;
    prev: number;
    budget: number;
    hasBudget: boolean;
  };

  const aggRows = useMemo((): AggRow[] => {
    const caByDay = new Map<string, { real: number; n1: number; prev: number }>();
    for (const item of caItems) {
      const key = scope === "year" ? item.report_date.slice(0, 7) : item.report_date;
      const p = caByDay.get(key) ?? { real: 0, n1: 0, prev: 0 };
      caByDay.set(key, {
        real: p.real + (item.kpi?.ca_real ?? item.ca_net_total ?? 0),
        n1: p.n1 + (item.kpi?.n1_ht ?? 0),
        prev: p.prev + (item.kpi?.prev_ht ?? 0),
      });
    }

    const budgetByKey = new Map<string, number>();
    for (const b of budgetRows) {
      const key = scope === "year" ? b.budget_date.slice(0, 7) : b.budget_date;
      budgetByKey.set(key, (budgetByKey.get(key) ?? 0) + b.ca_target);
    }

    if (scope === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, "0");
        const key = `${year}-${m}`;
        const ca = caByDay.get(key);
        const bgt = budgetByKey.get(key);
        return { key, label: MONTHS[i], caReal: ca?.real ?? 0, n1: ca?.n1 ?? 0, prev: ca?.prev ?? 0, budget: bgt ?? 0, hasBudget: bgt !== undefined };
      });
    }

    const y = Number(year);
    const m = Number(month);
    const lastDay = new Date(y, m, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      const key = `${year}-${String(m).padStart(2, "0")}-${d}`;
      const ca = caByDay.get(key);
      const bgt = budgetByKey.get(key);
      return { key, label: d, caReal: ca?.real ?? 0, n1: ca?.n1 ?? 0, prev: ca?.prev ?? 0, budget: bgt ?? 0, hasBudget: bgt !== undefined };
    });
  }, [caItems, budgetRows, scope, year, month]);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let caReal = 0, n1 = 0, prev = 0, budget = 0, budgetDays = 0;
    for (const r of aggRows) {
      caReal += r.caReal;
      n1 += r.n1;
      prev += r.prev;
      if (r.hasBudget) { budget += r.budget; budgetDays++; }
    }
    return { caReal, n1, prev, budget, budgetDays };
  }, [aggRows]);

  const ecartBudgetEur = totals.budget > 0 ? totals.caReal - totals.budget : null;
  const ecartBudgetPct = pct(totals.caReal, totals.budget);
  const ecartN1Pct = pct(totals.caReal, totals.n1);

  // ── Per-restaurant (mode "Tous les magasins") ─────────────────────────────────
  const perRestaurant = useMemo(() => {
    if (restaurant !== "") return [];
    const map = new Map<string, { caReal: number; n1: number; prev: number; budget: number; hasBudget: boolean }>();
    for (const item of caItems) {
      const p = map.get(item.restaurant_code) ?? { caReal: 0, n1: 0, prev: 0, budget: 0, hasBudget: false };
      map.set(item.restaurant_code, {
        ...p,
        caReal: p.caReal + (item.kpi?.ca_real ?? item.ca_net_total ?? 0),
        n1: p.n1 + (item.kpi?.n1_ht ?? 0),
        prev: p.prev + (item.kpi?.prev_ht ?? 0),
      });
    }
    for (const b of budgetRows) {
      const p = map.get(b.restaurant_code) ?? { caReal: 0, n1: 0, prev: 0, budget: 0, hasBudget: false };
      map.set(b.restaurant_code, { ...p, budget: p.budget + b.ca_target, hasBudget: true });
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => b.caReal - a.caReal);
  }, [caItems, budgetRows, restaurant]);

  const [hoveredDonut, setHoveredDonut] = useState<number | null>(null);

  if (!visible) return null;

  const hasBudget = totals.budgetDays > 0;

  return (
    <TabsContent value="budget" className="space-y-4">
      {/* ── Filtres ── */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-full space-y-1 sm:w-[140px]">
          <div className="text-xs text-muted-foreground">Période</div>
          <select className={selectClass} value={scope} onChange={(e) => setScope(e.target.value as "month" | "year")}>
            <option value="year">Année</option>
            <option value="month">Mois</option>
          </select>
        </div>
        <div className="w-full space-y-1 sm:w-[110px]">
          <div className="text-xs text-muted-foreground">Année</div>
          <select className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {scope === "month" && (
          <div className="w-full space-y-1 sm:w-[150px]">
            <div className="text-xs text-muted-foreground">Mois</div>
            <select className={selectClass} value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((label, i) => (
                <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="w-full space-y-1 sm:w-[240px]">
          <div className="text-xs text-muted-foreground">Restaurant</div>
          <select className={selectClass} value={restaurant} onChange={(e) => setRestaurant(e.target.value)}>
            <option value="">Tous les magasins</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.code}>{r.code} — {r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {err && <div className="text-sm text-destructive">{err}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : (
        <>
          {/* ── Cards ── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">CA Réel</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold">{compactMoneyFmt.format(totals.caReal)}</div>
                {totals.n1 > 0 && (
                  <div className={`text-xs mt-0.5 ${ecartN1Pct !== null && ecartN1Pct >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {ecartN1Pct !== null ? `${ecartN1Pct >= 0 ? "+" : ""}${(ecartN1Pct * 100).toFixed(1)}% vs N-1` : ""}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Objectif (Budget)</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {hasBudget ? (
                  <div className="text-2xl font-bold">{compactMoneyFmt.format(totals.budget)}</div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Aucun objectif saisi</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Écart vs Objectif</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {hasBudget && ecartBudgetEur !== null ? (
                  <>
                    <div className={`text-2xl font-bold ${ecartBudgetEur >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {ecartBudgetEur >= 0 ? "+" : ""}{compactMoneyFmt.format(ecartBudgetEur)}
                    </div>
                    <div className={`text-xs mt-0.5 ${ecartBudgetEur >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {ecartBudgetPct !== null ? `${ecartBudgetPct >= 0 ? "+" : ""}${(ecartBudgetPct * 100).toFixed(1)}%` : ""}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">—</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Statut</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {hasBudget ? (
                  <div className={`text-xl font-bold ${ecartBudgetEur !== null && ecartBudgetEur >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {ecartBudgetEur !== null && ecartBudgetEur >= 0 ? "✓ Objectif atteint" : "✗ Objectif non atteint"}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Aucun objectif</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── 3 Donuts + légende côte à côte (mode tous les magasins) ── */}
          {perRestaurant.length > 0 && (() => {
            const totalReal = perRestaurant.reduce((s, r) => s + r.caReal, 0);
            const totalN1   = perRestaurant.reduce((s, r) => s + r.n1, 0);
            const totalPrev = perRestaurant.reduce((s, r) => s + r.prev, 0);
            const RAD = 56, C = 2 * Math.PI * RAD;

            function DonutChart({ values, grandTotal, centerLabel, centerSub }: {
              values: number[];
              grandTotal: number;
              centerLabel: string;
              centerSub: string;
            }) {
              let off = 0;
              return (
                <div className="relative h-36 w-36 mx-auto">
                  <svg viewBox="0 0 160 160" className="h-full w-full">
                    <g transform="translate(80,80) rotate(-90)">
                      {values.map((val, idx) => {
                        const len = grandTotal > 0 ? Math.max(0, (val / grandTotal) * C) : 0;
                        const seg = (
                          <circle key={idx} r={RAD} cx={0} cy={0}
                            fill="transparent"
                            stroke={DONUT_COLORS[idx % DONUT_COLORS.length]}
                            strokeWidth={22}
                            strokeDasharray={`${len} ${Math.max(0, C - len)}`}
                            strokeDashoffset={-off}
                            className="cursor-pointer transition-opacity"
                            style={{ opacity: hoveredDonut === null || hoveredDonut === idx ? 1 : 0.3 }}
                            onMouseEnter={() => setHoveredDonut(idx)}
                            onMouseLeave={() => setHoveredDonut(null)}
                          />
                        );
                        off += len;
                        return seg;
                      })}
                      {grandTotal === 0 && <circle r={RAD} cx={0} cy={0} fill="transparent" stroke="#e2e8f0" strokeWidth={22} />}
                    </g>
                    <circle cx="80" cy="80" r="40" fill="hsl(var(--background))" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-center pointer-events-none">
                    {hoveredDonut === null ? (
                      <div>
                        <div className="text-[9px] text-muted-foreground font-medium">{centerLabel}</div>
                        <div className="text-[11px] font-bold leading-tight">{centerSub}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-[10px] font-semibold leading-tight" style={{ color: DONUT_COLORS[hoveredDonut % DONUT_COLORS.length] }}>
                          {perRestaurant[hoveredDonut]?.code}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {pctFmt.format(grandTotal > 0 ? (values[hoveredDonut] ?? 0) / grandTotal : 0)}
                        </div>
                        <div className="text-[10px] font-semibold">{compactMoneyFmt.format(values[hoveredDonut] ?? 0)}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm">Répartition par restaurant</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex gap-0 items-start overflow-x-auto">
                    {/* 3 donuts avec séparateurs verticaux */}
                    <div className="flex shrink-0 divide-x">
                      <div className="pr-5 text-center">
                        <div className="text-[11px] font-medium text-muted-foreground mb-2">CA Réel</div>
                        <DonutChart values={perRestaurant.map(r => r.caReal)} grandTotal={totalReal} centerLabel="Total" centerSub={compactMoneyFmt.format(totalReal)} />
                      </div>
                      <div className="px-5 text-center">
                        <div className="text-[11px] font-medium text-muted-foreground mb-2">CA N-1</div>
                        <DonutChart values={perRestaurant.map(r => r.n1)} grandTotal={totalN1} centerLabel="Total N-1" centerSub={compactMoneyFmt.format(totalN1)} />
                      </div>
                      <div className="pl-5 text-center">
                        <div className="text-[11px] font-medium text-muted-foreground mb-2">Prévision</div>
                        <DonutChart values={perRestaurant.map(r => r.prev)} grandTotal={totalPrev} centerLabel="Total Prév." centerSub={totalPrev > 0 ? compactMoneyFmt.format(totalPrev) : "—"} />
                      </div>
                    </div>

                    {/* Séparateur vertical */}
                    <div className="w-px bg-border mx-5 self-stretch shrink-0" />

                    {/* Légende / tableau */}
                    <div className="flex-1 min-w-0 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="pb-1.5 text-left font-normal">Restaurant</th>
                            <th className="pb-1.5 text-right font-normal">CA Réel</th>
                            <th className="pb-1.5 text-right font-normal">CA N-1</th>
                            <th className="pb-1.5 text-right font-normal">vs N-1</th>
                            <th className="pb-1.5 text-right font-normal">Prévision</th>
                            <th className="pb-1.5 text-right font-normal">vs Prév.</th>
                            {hasBudget && <th className="pb-1.5 text-right font-normal">Objectif</th>}
                            {hasBudget && <th className="pb-1.5 text-right font-normal">Statut</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {perRestaurant.map((row, idx) => {
                            const restauInfo = restaurants.find(x => x.code === row.code);
                            const ecartN1 = row.n1 > 0 ? pct(row.caReal, row.n1) : null;
                            const ecartPrev = row.prev > 0 ? pct(row.caReal, row.prev) : null;
                            const ecartObj = row.hasBudget ? pct(row.caReal, row.budget) : null;
                            return (
                              <tr
                                key={row.code}
                                className="border-b last:border-0 cursor-pointer"
                                style={{ opacity: hoveredDonut === null || hoveredDonut === idx ? 1 : 0.4 }}
                                onMouseEnter={() => setHoveredDonut(idx)}
                                onMouseLeave={() => setHoveredDonut(null)}
                              >
                                <td className="py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                                    <span className="font-medium">{row.code}</span>
                                    {restauInfo && <span className="text-muted-foreground truncate max-w-[100px]">{restauInfo.name}</span>}
                                  </div>
                                </td>
                                <td className="py-1.5 text-right tabular-nums font-medium">{compactMoneyFmt.format(row.caReal)}</td>
                                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.n1 > 0 ? compactMoneyFmt.format(row.n1) : "—"}</td>
                                <td className={`py-1.5 text-right tabular-nums ${ecartN1 !== null && ecartN1 >= 0 ? "text-green-600" : "text-red-500"}`}>
                                  {ecartN1 !== null ? `${ecartN1 >= 0 ? "+" : ""}${(ecartN1 * 100).toFixed(1)}%` : "—"}
                                </td>
                                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.prev > 0 ? compactMoneyFmt.format(row.prev) : "—"}</td>
                                <td className={`py-1.5 text-right tabular-nums ${ecartPrev !== null && ecartPrev >= 0 ? "text-green-600" : "text-red-500"}`}>
                                  {ecartPrev !== null ? `${ecartPrev >= 0 ? "+" : ""}${(ecartPrev * 100).toFixed(1)}%` : "—"}
                                </td>
                                {hasBudget && <td className="py-1.5 text-right tabular-nums text-muted-foreground">{row.hasBudget ? compactMoneyFmt.format(row.budget) : "—"}</td>}
                                {hasBudget && <td className="py-1.5 text-right"><StatusBadge ecartPct={ecartObj} /></td>}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Tableau détail ── */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">
                {scope === "year" ? `Détail mensuel ${year}` : `Détail journalier — ${MONTHS[Number(month) - 1]} ${year}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left">{scope === "year" ? "Mois" : "Jour"}</th>
                      <th className="px-4 py-2 text-right">CA Réel</th>
                      <th className="px-4 py-2 text-right">CA N-1</th>
                      <th className="px-4 py-2 text-right">% N-1</th>
                      <th className="px-4 py-2 text-right">Prévision</th>
                      <th className="px-4 py-2 text-right">% Prév.</th>
                      <th className="px-4 py-2 text-right">Objectif</th>
                      <th className="px-4 py-2 text-right">Écart €</th>
                      <th className="px-4 py-2 text-right">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggRows.map((row, idx) => {
                      const ecartEur = row.hasBudget ? row.caReal - row.budget : null;
                      const ecartBgt = row.hasBudget ? pct(row.caReal, row.budget) : null;
                      const ecartN1 = row.n1 > 0 ? pct(row.caReal, row.n1) : null;
                      const ecartPrev = row.prev > 0 ? pct(row.caReal, row.prev) : null;
                      return (
                        <tr key={row.key} className={`border-b last:border-0 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}>
                          <td className="px-4 py-2 font-medium">{row.label}</td>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {row.caReal > 0 ? moneyFmt.format(row.caReal) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {row.n1 > 0 ? moneyFmt.format(row.n1) : "—"}
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums text-xs ${ecartN1 !== null && ecartN1 >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {ecartN1 !== null ? `${ecartN1 >= 0 ? "+" : ""}${(ecartN1 * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {row.prev > 0 ? moneyFmt.format(row.prev) : "—"}
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums text-xs ${ecartPrev !== null && ecartPrev >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {ecartPrev !== null ? `${ecartPrev >= 0 ? "+" : ""}${(ecartPrev * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                            {row.hasBudget ? moneyFmt.format(row.budget) : <span className="italic">—</span>}
                          </td>
                          <td className={`px-4 py-2 text-right tabular-nums font-medium ${ecartEur !== null && ecartEur >= 0 ? "text-green-600" : ecartEur !== null ? "text-red-500" : ""}`}>
                            {ecartEur !== null ? `${ecartEur >= 0 ? "+" : ""}${moneyFmt.format(ecartEur)}` : "—"}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <StatusBadge ecartPct={ecartBgt} />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <td className="px-4 py-2">Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">{moneyFmt.format(totals.caReal)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{totals.n1 > 0 ? moneyFmt.format(totals.n1) : "—"}</td>
                      <td className={`px-4 py-2 text-right tabular-nums text-xs ${ecartN1Pct !== null && ecartN1Pct >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {ecartN1Pct !== null ? `${ecartN1Pct >= 0 ? "+" : ""}${(ecartN1Pct * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {totals.prev > 0 ? moneyFmt.format(totals.prev) : "—"}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums text-xs ${pct(totals.caReal, totals.prev) !== null && (pct(totals.caReal, totals.prev) ?? 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {totals.prev > 0 && pct(totals.caReal, totals.prev) !== null
                          ? `${(pct(totals.caReal, totals.prev)! >= 0 ? "+" : "")}${((pct(totals.caReal, totals.prev) ?? 0) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {hasBudget ? moneyFmt.format(totals.budget) : "—"}
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${ecartBudgetEur !== null && ecartBudgetEur >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {ecartBudgetEur !== null ? `${ecartBudgetEur >= 0 ? "+" : ""}${moneyFmt.format(ecartBudgetEur)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {hasBudget ? <StatusBadge ecartPct={ecartBudgetPct} /> : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </TabsContent>
  );
}

async function fetchAllMonths(year: string, restaurant: string): Promise<DailyReportItem[]> {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const results = await Promise.all(
    months.map((m) =>
      apiFetch<{ items: DailyReportItem[] }>(
        `/reports/bk/monthly?year=${year}&month=${m}${restaurant ? `&restaurant_code=${restaurant}` : ""}`
      ).then((r) => r.items).catch(() => [] as DailyReportItem[])
    )
  );
  return results.flat();
}
