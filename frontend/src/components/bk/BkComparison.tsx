import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BKReport } from "@/components/bk/types";

type Restaurant = { id: number; code: string; name: string };
type ReportListItem = { id: number; restaurant_code: string; report_date: string; created_at: string };
type MonthlyItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
  ca_net_total: number;
  ca_ttc_total: number;
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
    ca_click_collect: number | null;
    cnc_n1: number | null;
    client_click_collect: number | null;
    client_n1: number | null;
    cash_diff: number | null;
  } | null;
};

type Summary = {
  label: string;
  reportCount: number;
  ca_real: number;
  ca_n1: number;
  clients: number;
  ca_delivery: number;
  ca_click_collect: number;
  avg_ticket: number;
  comment?: string | null;
  comment_n1?: string | null;
};

type MetricKey =
  | "ca_real"
  | "ca_n1"
  | "clients"
  | "avg_ticket"
  | "ca_delivery"
  | "ca_click_collect";

const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const intFmt = new Intl.NumberFormat("fr-FR");
const pctFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

function num(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTotalRow(label: string, flag?: boolean) {
  return !!flag || label.trim().toUpperCase().startsWith("TOTAL");
}

function buildSummary(label: string, reports: BKReport[]): Summary {
  let caReal = 0;
  let caN1 = 0;
  let clients = 0;
  let caDelivery = 0;
  let caClickCollect = 0;

  reports.forEach((report) => {
    const channelRows = report.channel_sales.filter(
      (row) => !isTotalRow(row.channel_label, row.is_total)
    );
    const caNet = channelRows.reduce((acc, row) => acc + num(row.ca_net), 0);
    const tac = channelRows.reduce((acc, row) => acc + num(row.tac), 0);

    const caDeliveryRow = channelRows
      .filter((row) => row.channel_label.toUpperCase().startsWith("HOME DELIVERY"))
      .reduce((acc, row) => acc + num(row.ca_net), 0);
    const caClickCollectRow = channelRows
      .filter((row) => row.channel_label.toUpperCase().startsWith("CLICK & COLLECT"))
      .reduce((acc, row) => acc + num(row.ca_net), 0);

    const kpi = report.kpi;
    caReal += num(kpi?.ca_real ?? caNet);
    caN1 += num(kpi?.n1_ht ?? 0);
    clients += num(kpi?.clients ?? tac);
    caDelivery += num(kpi?.ca_delivery ?? caDeliveryRow);
    caClickCollect += num(kpi?.ca_click_collect ?? caClickCollectRow);
  });

  const avgTicket = clients ? caReal / clients : 0;
  const singleReport = reports.length === 1 ? reports[0] : null;

  return {
    label,
    reportCount: reports.length,
    ca_real: caReal,
    ca_n1: caN1,
    clients,
    ca_delivery: caDelivery,
    ca_click_collect: caClickCollect,
    avg_ticket: avgTicket,
    comment: singleReport?.comment ?? null,
    comment_n1: singleReport?.comment_n1 ?? null,
  };
}

function buildMonthlySummary(label: string, items: MonthlyItem[]): Summary {
  let caReal = 0;
  let caN1 = 0;
  let clients = 0;
  let caDelivery = 0;
  let caClickCollect = 0;

  items.forEach((item) => {
    const kpi = item.kpi;
    caReal += num(kpi?.ca_real ?? item.ca_net_total);
    caN1 += num(kpi?.n1_ht ?? 0);
    clients += num(kpi?.clients ?? item.tac_total);
    caDelivery += num(kpi?.ca_delivery ?? 0);
    caClickCollect += num(kpi?.ca_click_collect ?? 0);
  });

  const avgTicket = clients ? caReal / clients : 0;

  return {
    label,
    reportCount: items.length,
    ca_real: caReal,
    ca_n1: caN1,
    clients,
    ca_delivery: caDelivery,
    ca_click_collect: caClickCollect,
    avg_ticket: avgTicket,
  };
}

export function BkComparison({ restaurants }: { restaurants: Restaurant[] }) {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIsoDate(d);
  }, []);
  const now = new Date();
  const defaultMonthA = String(now.getMonth() + 1).padStart(2, "0");
  const defaultYearA = String(now.getFullYear());
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultMonthB = String(prev.getMonth() + 1).padStart(2, "0");
  const defaultYearB = String(prev.getFullYear());

  const [mode, setMode] = useState<"day" | "month">("day");
  const [dateA, setDateA] = useState(today);
  const [dateB, setDateB] = useState(yesterday);
  const [monthA, setMonthA] = useState(defaultMonthA);
  const [yearA, setYearA] = useState(defaultYearA);
  const [monthB, setMonthB] = useState(defaultMonthB);
  const [yearB, setYearB] = useState(defaultYearB);
  const [restaurantCode, setRestaurantCode] = useState("");
  const [summaryA, setSummaryA] = useState<Summary | null>(null);
  const [summaryB, setSummaryB] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<Record<MetricKey, boolean>>({
    ca_real: true,
    ca_n1: true,
    clients: true,
    avg_ticket: true,
    ca_delivery: true,
    ca_click_collect: true,
  });

  const metricDefs: Array<{ key: MetricKey; label: string; format: (v: number) => string }> = [
    { key: "ca_real", label: "CA net", format: (v) => moneyFmt.format(v) },
    { key: "ca_n1", label: "CA N-1", format: (v) => moneyFmt.format(v) },
    { key: "clients", label: "Clients", format: (v) => intFmt.format(v) },
    { key: "avg_ticket", label: "Panier moyen", format: (v) => moneyFmt.format(v) },
    { key: "ca_delivery", label: "CA delivery", format: (v) => moneyFmt.format(v) },
    { key: "ca_click_collect", label: "CA click & collect", format: (v) => moneyFmt.format(v) },
  ];

  const selectedMetrics = metricDefs.filter((m) => metrics[m.key]);
  const commentSummaries = [summaryA, summaryB].filter((s): s is Summary => Boolean(s));

  const canSelectRestaurant = restaurants.length > 1;
  const fixedRestaurantCode = restaurants.length === 1 ? restaurants[0].code : "";
  const finalRestaurantCode = (restaurantCode || fixedRestaurantCode).trim().toUpperCase();

  async function loadDaySummary(dateValue: string, label: string) {
    const params = new URLSearchParams();
    params.set("start_date", dateValue);
    params.set("end_date", dateValue);
    if (finalRestaurantCode) params.set("restaurant_code", finalRestaurantCode);
    const list = await apiFetch<ReportListItem[]>(`/reports/bk?${params.toString()}`);
    if (list.length === 0) {
      return buildSummary(label, []);
    }
    const details = await Promise.all(
      list.map((item) => apiFetch<BKReport>(`/reports/bk/${item.id}`))
    );
    return buildSummary(label, details);
  }

  async function loadMonthSummary(yearValue: string, monthValue: string, label: string) {
    const params = new URLSearchParams();
    params.set("year", yearValue);
    params.set("month", String(Number(monthValue)));
    if (finalRestaurantCode) params.set("restaurant_code", finalRestaurantCode);
    const data = await apiFetch<MonthlyItem[]>(`/reports/bk/monthly?${params.toString()}`);
    return buildMonthlySummary(label, data);
  }

  async function handleCompare() {
    setErr(null);
    setLoading(true);
    try {
      if (mode === "day") {
        const [a, b] = await Promise.all([
          loadDaySummary(dateA, dateA),
          loadDaySummary(dateB, dateB),
        ]);
        setSummaryA(a);
        setSummaryB(b);
      } else {
        const labelA = `${monthA}/${yearA}`;
        const labelB = `${monthB}/${yearB}`;
        const [a, b] = await Promise.all([
          loadMonthSummary(yearA, monthA, labelA),
          loadMonthSummary(yearB, monthB, labelB),
        ]);
        setSummaryA(a);
        setSummaryB(b);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur comparaison");
      setSummaryA(null);
      setSummaryB(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparaison simple</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Compare deux jours ou deux mois, avec selection des indicateurs.
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Mode</div>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value as "day" | "month")}
            >
              <option value="day">Jour</option>
              <option value="month">Mois</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Restaurant</div>
            {canSelectRestaurant ? (
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={restaurantCode}
                onChange={(e) => setRestaurantCode(e.target.value)}
              >
                <option value="">Tous</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <Input value={fixedRestaurantCode || restaurantCode} readOnly />
            )}
          </div>
          {mode === "day" ? (
            <>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Jour A</div>
                <Input type="date" value={dateA} onChange={(e) => setDateA(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Jour B</div>
                <Input type="date" value={dateB} onChange={(e) => setDateB(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Mois A</div>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    min="1"
                    max="12"
                    value={monthA}
                    onChange={(e) => setMonthA(e.target.value.padStart(2, "0"))}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    value={yearA}
                    onChange={(e) => setYearA(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Mois B</div>
                <div className="flex gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    min="1"
                    max="12"
                    value={monthB}
                    onChange={(e) => setMonthB(e.target.value.padStart(2, "0"))}
                  />
                  <Input
                    className="w-28"
                    type="number"
                    value={yearB}
                    onChange={(e) => setYearB(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground mb-2">Données à remonter</div>
          <div className="flex flex-wrap gap-3">
            {metricDefs.map((metric) => (
              <label key={metric.key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={metrics[metric.key]}
                  onChange={(e) =>
                    setMetrics((prev) => ({ ...prev, [metric.key]: e.target.checked }))
                  }
                />
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleCompare} disabled={loading}>
            {loading ? "Chargement..." : "Comparer"}
          </Button>
          {summaryA && summaryB && (
            <div className="text-xs text-muted-foreground">
              {summaryA.reportCount} rapport(s) vs {summaryB.reportCount} rapport(s)
            </div>
          )}
        </div>

        {err && <div className="text-sm text-destructive whitespace-pre-wrap">{err}</div>}

        {summaryA && summaryB && selectedMetrics.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicateur</TableHead>
                  <TableHead>{summaryA.label}</TableHead>
                  <TableHead>{summaryB.label}</TableHead>
                  <TableHead>Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedMetrics.map((metric) => {
                  const a = summaryA[metric.key];
                  const b = summaryB[metric.key];
                  const delta = b - a;
                  const pct = a ? delta / a : null;
                  return (
                    <TableRow key={metric.key}>
                      <TableCell className="text-xs">{metric.label}</TableCell>
                      <TableCell>{metric.format(a)}</TableCell>
                      <TableCell>{metric.format(b)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className={delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {metric.format(delta)}
                          </span>
                          {pct !== null && (
                            <span className="text-muted-foreground">
                              ({pctFmt.format(Math.abs(pct))})
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {mode === "day" &&
          (summaryA?.comment || summaryA?.comment_n1 || summaryB?.comment || summaryB?.comment_n1) && (
            <div className="grid gap-3 md:grid-cols-2">
              {commentSummaries.map((summary) => (
                <div key={summary.label} className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    Commentaire {summary.label}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{summary.comment || "—"}</div>
                  {summary.comment_n1 && (
                    <>
                      <div className="text-xs text-muted-foreground mt-2">Commentaire N-1</div>
                      <div className="text-sm whitespace-pre-wrap">{summary.comment_n1}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
