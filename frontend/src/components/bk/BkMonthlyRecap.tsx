import { useEffect, useMemo, useState } from "react";
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

type Restaurant = { id: number; code: string; name: string };

type MonthlyItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
  ca_net_total: number;
  ca_ttc_total: number;
  tac_total: number;
};

type Props = {
  restaurants: Restaurant[];
};

function toMonthValue(value: Date) {
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 7);
}

function toIsoDate(year: number, monthIndex: number, day: number) {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toISOString().slice(0, 10);
}

function getIsoWeek(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: tmp.getUTCFullYear() };
}

const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });
const dayMonthFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const intFmt = new Intl.NumberFormat("fr-FR");

export function BkMonthlyRecap({ restaurants }: Props) {
  const defaultMonth = useMemo(() => toMonthValue(new Date()), []);
  const [month, setMonth] = useState(defaultMonth);
  const [restaurantCode, setRestaurantCode] = useState("");
  const [items, setItems] = useState<MonthlyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSelectRestaurant = restaurants.length > 1;
  const fixedRestaurantCode = restaurants.length === 1 ? restaurants[0].code : "";
  const finalRestaurantCode = (restaurantCode || fixedRestaurantCode).trim().toUpperCase();

  async function loadMonthly() {
    if (!month) return;
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    if (!year || !monthNum) return;

    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("month", String(monthNum));
      if (finalRestaurantCode) params.set("restaurant_code", finalRestaurantCode);

      const data = await apiFetch<MonthlyItem[]>(`/reports/bk/monthly?${params.toString()}`);
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Erreur chargement recap");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (fixedRestaurantCode && !restaurantCode) {
      setRestaurantCode(fixedRestaurantCode);
    }
  }, [fixedRestaurantCode, restaurantCode]);

  useEffect(() => {
    loadMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayRows = useMemo(() => {
    if (!month) return [];
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    if (!year || !monthNum) return [];

    const monthIndex = monthNum - 1;
    const lastDay = new Date(year, monthNum, 0).getDate();

    const totalsByDate = new Map<
      string,
      { ca_net_total: number; ca_ttc_total: number; tac_total: number }
    >();
    for (const item of items) {
      const entry = totalsByDate.get(item.report_date) || {
        ca_net_total: 0,
        ca_ttc_total: 0,
        tac_total: 0,
      };
      entry.ca_net_total += item.ca_net_total || 0;
      entry.ca_ttc_total += item.ca_ttc_total || 0;
      entry.tac_total += item.tac_total || 0;
      totalsByDate.set(item.report_date, entry);
    }

    const rows: Array<
      | {
          type: "day";
          date: string;
          weekday: string;
          label: string;
          ca_net_total: number | null;
          ca_ttc_total: number | null;
          tac_total: number | null;
        }
      | {
          type: "week";
          label: string;
          ca_net_total: number;
          ca_ttc_total: number;
          tac_total: number;
        }
    > = [];

    let currentWeekKey = "";
    let weekTotals = { ca_net_total: 0, ca_ttc_total: 0, tac_total: 0 };

    const pushWeek = () => {
      if (!currentWeekKey) return;
      rows.push({
        type: "week",
        label: currentWeekKey,
        ...weekTotals,
      });
      weekTotals = { ca_net_total: 0, ca_ttc_total: 0, tac_total: 0 };
    };

    for (let day = 1; day <= lastDay; day += 1) {
      const iso = toIsoDate(year, monthIndex, day);
      const dateObj = new Date(iso);
      const { week, year: weekYear } = getIsoWeek(dateObj);
      const weekKey = `semaine${week}${weekYear}`;

      if (currentWeekKey && weekKey !== currentWeekKey) {
        pushWeek();
      }
      currentWeekKey = weekKey;

      const totals = totalsByDate.get(iso);
      if (totals) {
        weekTotals.ca_net_total += totals.ca_net_total;
        weekTotals.ca_ttc_total += totals.ca_ttc_total;
        weekTotals.tac_total += totals.tac_total;
      }

      rows.push({
        type: "day",
        date: iso,
        weekday: weekdayFmt.format(dateObj),
        label: dayMonthFmt.format(dateObj),
        ca_net_total: totals ? totals.ca_net_total : null,
        ca_ttc_total: totals ? totals.ca_ttc_total : null,
        tac_total: totals ? totals.tac_total : null,
      });
    }

    pushWeek();

    return rows;
  }, [items, month]);

  const monthTotals = useMemo(() => {
    return dayRows.reduce(
      (acc, row) => {
        if (row.type !== "day") return acc;
        acc.ca_net_total += row.ca_net_total || 0;
        acc.ca_ttc_total += row.ca_ttc_total || 0;
        acc.tac_total += row.tac_total || 0;
        return acc;
      },
      { ca_net_total: 0, ca_ttc_total: 0, tac_total: 0 }
    );
  }, [dayRows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recap mensuel BK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Une ligne par jour + cumul par semaine et total du mois.
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Mois</div>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
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
          <div className="flex items-end">
            <Button onClick={loadMonthly} disabled={loading}>
              {loading ? "Chargement..." : "Charger"}
            </Button>
          </div>
        </div>

        {err && <div className="text-sm text-destructive whitespace-pre-wrap">{err}</div>}

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jour</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">TAC</TableHead>
                <TableHead className="text-right">CA HT</TableHead>
                <TableHead className="text-right">CA TTC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Aucun rapport pour ce mois.
                  </TableCell>
                </TableRow>
              ) : (
                dayRows.map((row, index) => {
                  if (row.type === "week") {
                    return (
                      <TableRow key={`${row.label}-${index}`} className="bg-muted/30">
                        <TableCell className="font-medium" colSpan={2}>
                          {row.label}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {intFmt.format(row.tac_total)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {moneyFmt.format(row.ca_net_total)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {moneyFmt.format(row.ca_ttc_total)}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow key={row.date}>
                      <TableCell className="capitalize">{row.weekday}</TableCell>
                      <TableCell className="font-mono text-xs">{row.label}</TableCell>
                      <TableCell className="text-right">
                        {row.tac_total === null ? "—" : intFmt.format(row.tac_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.ca_net_total === null ? "—" : moneyFmt.format(row.ca_net_total)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.ca_ttc_total === null ? "—" : moneyFmt.format(row.ca_ttc_total)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {dayRows.length > 0 && (
                <TableRow className="bg-primary/5">
                  <TableCell className="font-semibold" colSpan={2}>
                    Total mois
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {intFmt.format(monthTotals.tac_total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {moneyFmt.format(monthTotals.ca_net_total)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {moneyFmt.format(monthTotals.ca_ttc_total)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
