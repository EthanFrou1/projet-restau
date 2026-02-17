
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
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
  comment?: string | null;
  comment_n1?: string | null;
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
const monthNameFmt = new Intl.DateTimeFormat("fr-FR", { month: "long" });
const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const percentFmt = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat("fr-FR");

export function BkMonthlyRecap({ restaurants }: Props) {
  const defaultMonth = useMemo(() => toMonthValue(new Date()), []);
  const todayIso = useMemo(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 10);
  }, []);
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
    if (!month) return;
    loadMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, finalRestaurantCode]);

  const filteredItems = useMemo(() => {
    if (!finalRestaurantCode) return items;
    return items.filter(
      (item) => item.restaurant_code?.toUpperCase() === finalRestaurantCode
    );
  }, [items, finalRestaurantCode]);

  const dayRows = useMemo(() => {
    if (!month) return [];
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    if (!year || !monthNum) return [];

    const monthIndex = monthNum - 1;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const monthLabel = monthNameFmt.format(new Date(year, monthIndex, 1));

    const inputsByDate = new Map<
      string,
      {
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
        comment: string | null;
        comment_n1: string | null;
      }
    >();

    const mergeComment = (current: string | null, next: string | null) => {
      if (!next) return current;
      if (!current) return next;
      if (current.includes(next)) return current;
      return `${current} | ${next}`;
    };

    for (const item of filteredItems) {
      const kpi = item.kpi;
      const current = inputsByDate.get(item.report_date) || {
        n1_ht: null,
        var_n1: null,
        prev_ht: null,
        ca_real: null,
        clients: null,
        clients_n1: null,
        ca_delivery: null,
        ca_delivery_n1: null,
        client_delivery: null,
        client_delivery_n1: null,
        ca_click_collect: null,
        cnc_n1: null,
        client_click_collect: null,
        client_n1: null,
        cash_diff: null,
        comment: null,
        comment_n1: null,
      };

      const ca_real = kpi?.ca_real ?? item.ca_net_total ?? null;
      const clients = kpi?.clients ?? item.tac_total ?? null;

      inputsByDate.set(item.report_date, {
        n1_ht: kpi?.n1_ht ?? current.n1_ht,
        var_n1: kpi?.var_n1 ?? current.var_n1,
        prev_ht: kpi?.prev_ht ?? current.prev_ht,
        ca_real: ca_real ?? current.ca_real,
        clients: clients ?? current.clients,
        clients_n1: kpi?.clients_n1 ?? current.clients_n1,
        ca_delivery: kpi?.ca_delivery ?? current.ca_delivery,
        ca_delivery_n1: kpi?.ca_delivery_n1 ?? current.ca_delivery_n1,
        client_delivery: kpi?.client_delivery ?? current.client_delivery,
        client_delivery_n1: kpi?.client_delivery_n1 ?? current.client_delivery_n1,
        ca_click_collect: kpi?.ca_click_collect ?? current.ca_click_collect,
        cnc_n1: kpi?.cnc_n1 ?? current.cnc_n1,
        client_click_collect: kpi?.client_click_collect ?? current.client_click_collect,
        client_n1: kpi?.client_n1 ?? current.client_n1,
        cash_diff: kpi?.cash_diff ?? current.cash_diff,
        comment: mergeComment(current.comment, item.comment ?? null),
        comment_n1: mergeComment(current.comment_n1, item.comment_n1 ?? null),
      });
    }

    const rows: Array<
      | {
          type: "day";
          date: string;
          weekday: string;
          label: string;
          comment: string | null;
          comment_n1: string | null;
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
        }
      | {
          type: "week";
          label: string;
          comment?: string | null;
          comment_n1?: string | null;
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
        }
    > = [];

    let currentWeekKey = "";
    let currentWeekLabel = "";
    let weekTotals = {
      n1_ht: null as number | null,
      var_n1: null as number | null,
      prev_ht: null as number | null,
      ca_real: null as number | null,
      clients: null as number | null,
      clients_n1: null as number | null,
      ca_delivery: null as number | null,
      ca_delivery_n1: null as number | null,
      client_delivery: null as number | null,
      client_delivery_n1: null as number | null,
      ca_click_collect: null as number | null,
      cnc_n1: null as number | null,
      client_click_collect: null as number | null,
      client_n1: null as number | null,
      cash_diff: null as number | null,
    };

    const sumNullable = (a: number | null, b: number | null) => {
      if (a === null && b === null) return null;
      return (a ?? 0) + (b ?? 0);
    };

    const pushWeek = () => {
      if (!currentWeekKey) return;
      rows.push({
        type: "week",
        label: currentWeekLabel || currentWeekKey,
        ...weekTotals,
      });
      weekTotals = {
        n1_ht: null,
        var_n1: null,
        prev_ht: null,
        ca_real: null,
        clients: null,
        clients_n1: null,
        ca_delivery: null,
        ca_delivery_n1: null,
        client_delivery: null,
        client_delivery_n1: null,
        ca_click_collect: null,
        cnc_n1: null,
        client_click_collect: null,
        client_n1: null,
        cash_diff: null,
      };
    };

    for (let day = 1; day <= lastDay; day += 1) {
      const iso = toIsoDate(year, monthIndex, day);
      const dateObj = new Date(iso);
      const { week, year: weekYear } = getIsoWeek(dateObj);
      const weekKey = `semaine${week}${weekYear}`;
      const weekLabel = `semaine ${week} (${monthLabel} ${year})`;

      if (currentWeekKey && weekKey !== currentWeekKey) {
        pushWeek();
      }
      currentWeekKey = weekKey;
      currentWeekLabel = weekLabel;

      const inputs = inputsByDate.get(iso);
      if (inputs) {
        weekTotals.n1_ht = sumNullable(weekTotals.n1_ht, inputs.n1_ht);
        weekTotals.var_n1 = sumNullable(weekTotals.var_n1, inputs.var_n1);
        weekTotals.prev_ht = sumNullable(weekTotals.prev_ht, inputs.prev_ht);
        weekTotals.ca_real = sumNullable(weekTotals.ca_real, inputs.ca_real);
        weekTotals.clients = sumNullable(weekTotals.clients, inputs.clients);
        weekTotals.clients_n1 = sumNullable(weekTotals.clients_n1, inputs.clients_n1);
        weekTotals.ca_delivery = sumNullable(weekTotals.ca_delivery, inputs.ca_delivery);
        weekTotals.ca_delivery_n1 = sumNullable(weekTotals.ca_delivery_n1, inputs.ca_delivery_n1);
        weekTotals.client_delivery = sumNullable(weekTotals.client_delivery, inputs.client_delivery);
        weekTotals.client_delivery_n1 = sumNullable(
          weekTotals.client_delivery_n1,
          inputs.client_delivery_n1
        );
        weekTotals.ca_click_collect = sumNullable(
          weekTotals.ca_click_collect,
          inputs.ca_click_collect
        );
        weekTotals.cnc_n1 = sumNullable(weekTotals.cnc_n1, inputs.cnc_n1);
        weekTotals.client_click_collect = sumNullable(
          weekTotals.client_click_collect,
          inputs.client_click_collect
        );
        weekTotals.client_n1 = sumNullable(weekTotals.client_n1, inputs.client_n1);
        weekTotals.cash_diff = sumNullable(weekTotals.cash_diff, inputs.cash_diff);
      }

      rows.push({
        type: "day",
        date: iso,
        weekday: weekdayFmt.format(dateObj),
        label: dayMonthFmt.format(dateObj),
        comment: inputs ? inputs.comment : null,
        comment_n1: inputs ? inputs.comment_n1 : null,
        n1_ht: inputs ? inputs.n1_ht : null,
        var_n1: inputs ? inputs.var_n1 : null,
        prev_ht: inputs ? inputs.prev_ht : null,
        ca_real: inputs ? inputs.ca_real : null,
        clients: inputs ? inputs.clients : null,
        clients_n1: inputs ? inputs.clients_n1 : null,
        ca_delivery: inputs ? inputs.ca_delivery : null,
        ca_delivery_n1: inputs ? inputs.ca_delivery_n1 : null,
        client_delivery: inputs ? inputs.client_delivery : null,
        client_delivery_n1: inputs ? inputs.client_delivery_n1 : null,
        ca_click_collect: inputs ? inputs.ca_click_collect : null,
        cnc_n1: inputs ? inputs.cnc_n1 : null,
        client_click_collect: inputs ? inputs.client_click_collect : null,
        client_n1: inputs ? inputs.client_n1 : null,
        cash_diff: inputs ? inputs.cash_diff : null,
      });
    }

    pushWeek();

    return rows;
  }, [filteredItems, month]);

  const monthTotals = useMemo(() => {
    const sumNullable = (a: number | null, b: number | null) => {
      if (a === null && b === null) return null;
      return (a ?? 0) + (b ?? 0);
    };

    return dayRows.reduce(
      (acc, row) => {
        if (row.type !== "day") return acc;
        acc.n1_ht = sumNullable(acc.n1_ht, row.n1_ht);
        acc.var_n1 = sumNullable(acc.var_n1, row.var_n1);
        acc.prev_ht = sumNullable(acc.prev_ht, row.prev_ht);
        acc.ca_real = sumNullable(acc.ca_real, row.ca_real);
        acc.clients = sumNullable(acc.clients, row.clients);
        acc.clients_n1 = sumNullable(acc.clients_n1, row.clients_n1);
        acc.ca_delivery = sumNullable(acc.ca_delivery, row.ca_delivery);
        acc.ca_delivery_n1 = sumNullable(acc.ca_delivery_n1, row.ca_delivery_n1);
        acc.client_delivery = sumNullable(acc.client_delivery, row.client_delivery);
        acc.client_delivery_n1 = sumNullable(acc.client_delivery_n1, row.client_delivery_n1);
        acc.ca_click_collect = sumNullable(acc.ca_click_collect, row.ca_click_collect);
        acc.cnc_n1 = sumNullable(acc.cnc_n1, row.cnc_n1);
        acc.client_click_collect = sumNullable(
          acc.client_click_collect,
          row.client_click_collect
        );
        acc.client_n1 = sumNullable(acc.client_n1, row.client_n1);
        acc.cash_diff = sumNullable(acc.cash_diff, row.cash_diff);
        return acc;
      },
      {
        n1_ht: null as number | null,
        var_n1: null as number | null,
        prev_ht: null as number | null,
        ca_real: null as number | null,
        clients: null as number | null,
        clients_n1: null as number | null,
        ca_delivery: null as number | null,
        ca_delivery_n1: null as number | null,
        client_delivery: null as number | null,
        client_delivery_n1: null as number | null,
        ca_click_collect: null as number | null,
        cnc_n1: null as number | null,
        client_click_collect: null as number | null,
        client_n1: null as number | null,
        cash_diff: null as number | null,
      }
    );
  }, [dayRows]);

  const safeDiv = (num: number | null, den: number | null) => {
    if (num === null || den === null || den === 0) return null;
    return num / den;
  };

  const calcRow = (row: typeof dayRows[number]) => {
    const n1_ht = row.n1_ht;
    const prev_ht = row.prev_ht;
    const ca_real = row.ca_real;
    const clients = row.clients;
    const clients_n1 = row.clients_n1;
    const ca_delivery = row.ca_delivery;
    const ca_delivery_n1 = row.ca_delivery_n1;
    const client_delivery = row.client_delivery;
    const client_delivery_n1 = row.client_delivery_n1;
    const ca_click_collect = row.ca_click_collect;
    const cnc_n1 = row.cnc_n1;
    const client_click_collect = row.client_click_collect;
    const client_n1 = row.client_n1;
    const cash_diff = row.cash_diff;

    const prev_vs_n1 = safeDiv(
      prev_ht !== null && n1_ht !== null ? prev_ht - n1_ht : null,
      n1_ht
    );
    const ca_vs_n1 = safeDiv(
      ca_real !== null && n1_ht !== null ? ca_real - n1_ht : null,
      n1_ht
    );
    const ecart_prev = ca_real !== null && prev_ht !== null ? ca_real - prev_ht : null;
    const ecart_prev_pct = safeDiv(ecart_prev, prev_ht);
    const clients_pct_n1 = safeDiv(
      clients !== null && clients_n1 !== null ? clients - clients_n1 : null,
      clients_n1
    );
    const mp = safeDiv(ca_real, clients);
    const mp_n1 = safeDiv(n1_ht, clients_n1);
    const mp_pct_n1 = safeDiv(mp !== null && mp_n1 !== null ? mp - mp_n1 : null, mp_n1);

    const ca_delivery_pct_n1 = safeDiv(
      ca_delivery !== null && ca_delivery_n1 !== null ? ca_delivery - ca_delivery_n1 : null,
      ca_delivery_n1
    );
    const client_delivery_pct_n1 = safeDiv(
      client_delivery !== null && client_delivery_n1 !== null
        ? client_delivery - client_delivery_n1
        : null,
      client_delivery_n1
    );
    const mp_delivery = safeDiv(ca_delivery, client_delivery);
    const mp_delivery_n1 = safeDiv(ca_delivery_n1, client_delivery_n1);
    const mp_delivery_pct_n1 = safeDiv(
      mp_delivery !== null && mp_delivery_n1 !== null ? mp_delivery - mp_delivery_n1 : null,
      mp_delivery_n1
    );
    const pct_ca_delivery = safeDiv(ca_delivery, ca_real);

    const cnc_pct_n1 = safeDiv(
      ca_click_collect !== null && cnc_n1 !== null ? ca_click_collect - cnc_n1 : null,
      cnc_n1
    );
    const client_cnc_pct_n1 = safeDiv(
      client_click_collect !== null && client_n1 !== null
        ? client_click_collect - client_n1
        : null,
      client_n1
    );
    const mp_cnc = safeDiv(ca_click_collect, client_click_collect);
    const mp_cnc_n1 = safeDiv(cnc_n1, client_n1);
    const mp_cnc_pct_n1 = safeDiv(
      mp_cnc !== null && mp_cnc_n1 !== null ? mp_cnc - mp_cnc_n1 : null,
      mp_cnc_n1
    );
    const pct_ca_cnc = safeDiv(ca_click_collect, ca_real);

    const cash_diff_pct_ca = safeDiv(cash_diff, ca_real);

    return {
      prev_vs_n1,
      ca_vs_n1,
      ecart_prev,
      ecart_prev_pct,
      clients_pct_n1,
      mp,
      mp_n1,
      mp_pct_n1,
      ca_delivery_pct_n1,
      client_delivery_pct_n1,
      mp_delivery,
      mp_delivery_n1,
      mp_delivery_pct_n1,
      pct_ca_delivery,
      cnc_pct_n1,
      client_cnc_pct_n1,
      mp_cnc,
      mp_cnc_n1,
      mp_cnc_pct_n1,
      pct_ca_cnc,
      cash_diff_pct_ca,
    };
  };

  const formatMoney = (value: number | null) => (value === null ? "—" : moneyFmt.format(value));
  const formatPercent = (value: number | null) => (value === null ? "—" : percentFmt.format(value));
  const formatInt = (value: number | null) => (value === null ? "—" : intFmt.format(value));
  const compareClass = (value: number | null, other: number | null) => {
    if (value === null || other === null) return "";
    if (value === other) return "text-muted-foreground";
    return value > other ? "text-emerald-700" : "text-red-600";
  };
  const colCaClass = "bg-amber-50/70";
  const colClientsClass = "bg-sky-50/70";
  const colMpClass = "bg-emerald-50/70";
  const colCncClass = "bg-teal-50/60";
  const workforceStats = useMemo(() => {
    const byDate = new Map<
      string,
      {
        heuresPersonnel: number;
        heuresPersonnelN1: number;
        heuresTravail: number;
        heuresTravailN1: number;
        tauxHoraire: number;
        tauxHoraireN1: number;
        osat: number;
        osatN1: number;
        gxi: number;
        gxiN1: number;
        google: number;
        googleN1: number;
        countTauxHoraire: number;
        countTauxHoraireN1: number;
        countOsat: number;
        countOsatN1: number;
        countGxi: number;
        countGxiN1: number;
        countGoogle: number;
        countGoogleN1: number;
      }
    >();

    filteredItems.forEach((item) => {
      const key = item.report_date;
      const current = byDate.get(key) ?? {
        heuresPersonnel: 0,
        heuresPersonnelN1: 0,
        heuresTravail: 0,
        heuresTravailN1: 0,
        tauxHoraire: 0,
        tauxHoraireN1: 0,
        osat: 0,
        osatN1: 0,
        gxi: 0,
        gxiN1: 0,
        google: 0,
        googleN1: 0,
        countTauxHoraire: 0,
        countTauxHoraireN1: 0,
        countOsat: 0,
        countOsatN1: 0,
        countGxi: 0,
        countGxiN1: 0,
        countGoogle: 0,
        countGoogleN1: 0,
      };
      const kpi = item.kpi;
      if (!kpi) return;

      current.heuresPersonnel += kpi.heures_personnel ?? 0;
      current.heuresPersonnelN1 += kpi.heures_personnel_n1 ?? 0;
      current.heuresTravail += kpi.heures_travail ?? 0;
      current.heuresTravailN1 += kpi.heures_travail_n1 ?? 0;

      if (kpi.taux_horaire !== null && kpi.taux_horaire !== undefined) {
        current.tauxHoraire += kpi.taux_horaire;
        current.countTauxHoraire += 1;
      }
      if (kpi.taux_horaire_n1 !== null && kpi.taux_horaire_n1 !== undefined) {
        current.tauxHoraireN1 += kpi.taux_horaire_n1;
        current.countTauxHoraireN1 += 1;
      }
      if (kpi.osat_score !== null && kpi.osat_score !== undefined) {
        current.osat += kpi.osat_score;
        current.countOsat += 1;
      }
      if (kpi.osat_score_n1 !== null && kpi.osat_score_n1 !== undefined) {
        current.osatN1 += kpi.osat_score_n1;
        current.countOsatN1 += 1;
      }
      if (kpi.gxi_score !== null && kpi.gxi_score !== undefined) {
        current.gxi += kpi.gxi_score;
        current.countGxi += 1;
      }
      if (kpi.gxi_score_n1 !== null && kpi.gxi_score_n1 !== undefined) {
        current.gxiN1 += kpi.gxi_score_n1;
        current.countGxiN1 += 1;
      }
      if (kpi.google_score !== null && kpi.google_score !== undefined) {
        current.google += kpi.google_score;
        current.countGoogle += 1;
      }
      if (kpi.google_score_n1 !== null && kpi.google_score_n1 !== undefined) {
        current.googleN1 += kpi.google_score_n1;
        current.countGoogleN1 += 1;
      }

      byDate.set(key, current);
    });

    const byDateComputed = new Map<
      string,
      {
        heuresPersonnel: number | null;
        heuresPersonnelN1: number | null;
        heuresTravail: number | null;
        heuresTravailN1: number | null;
        tauxHoraire: number | null;
        tauxHoraireN1: number | null;
        osat: number | null;
        osatN1: number | null;
        gxi: number | null;
        gxiN1: number | null;
        google: number | null;
        googleN1: number | null;
      }
    >();

    const monthTotalsRaw = {
      heuresPersonnel: 0,
      heuresPersonnelN1: 0,
      heuresTravail: 0,
      heuresTravailN1: 0,
      tauxHoraire: 0,
      tauxHoraireN1: 0,
      osat: 0,
      osatN1: 0,
      gxi: 0,
      gxiN1: 0,
      google: 0,
      googleN1: 0,
      countTauxHoraire: 0,
      countTauxHoraireN1: 0,
      countOsat: 0,
      countOsatN1: 0,
      countGxi: 0,
      countGxiN1: 0,
      countGoogle: 0,
      countGoogleN1: 0,
    };

    Array.from(byDate.values()).forEach((row) => {
      monthTotalsRaw.heuresPersonnel += row.heuresPersonnel;
      monthTotalsRaw.heuresPersonnelN1 += row.heuresPersonnelN1;
      monthTotalsRaw.heuresTravail += row.heuresTravail;
      monthTotalsRaw.heuresTravailN1 += row.heuresTravailN1;
      monthTotalsRaw.tauxHoraire += row.tauxHoraire;
      monthTotalsRaw.tauxHoraireN1 += row.tauxHoraireN1;
      monthTotalsRaw.osat += row.osat;
      monthTotalsRaw.osatN1 += row.osatN1;
      monthTotalsRaw.gxi += row.gxi;
      monthTotalsRaw.gxiN1 += row.gxiN1;
      monthTotalsRaw.google += row.google;
      monthTotalsRaw.googleN1 += row.googleN1;
      monthTotalsRaw.countTauxHoraire += row.countTauxHoraire;
      monthTotalsRaw.countTauxHoraireN1 += row.countTauxHoraireN1;
      monthTotalsRaw.countOsat += row.countOsat;
      monthTotalsRaw.countOsatN1 += row.countOsatN1;
      monthTotalsRaw.countGxi += row.countGxi;
      monthTotalsRaw.countGxiN1 += row.countGxiN1;
      monthTotalsRaw.countGoogle += row.countGoogle;
      monthTotalsRaw.countGoogleN1 += row.countGoogleN1;
    });

    byDate.forEach((row, date) => {
      byDateComputed.set(date, {
        heuresPersonnel: row.heuresPersonnel || null,
        heuresPersonnelN1: row.heuresPersonnelN1 || null,
        heuresTravail: row.heuresTravail || null,
        heuresTravailN1: row.heuresTravailN1 || null,
        tauxHoraire: row.countTauxHoraire > 0 ? row.tauxHoraire / row.countTauxHoraire : null,
        tauxHoraireN1:
          row.countTauxHoraireN1 > 0 ? row.tauxHoraireN1 / row.countTauxHoraireN1 : null,
        osat: row.countOsat > 0 ? row.osat / row.countOsat : null,
        osatN1: row.countOsatN1 > 0 ? row.osatN1 / row.countOsatN1 : null,
        gxi: row.countGxi > 0 ? row.gxi / row.countGxi : null,
        gxiN1: row.countGxiN1 > 0 ? row.gxiN1 / row.countGxiN1 : null,
        google: row.countGoogle > 0 ? row.google / row.countGoogle : null,
        googleN1: row.countGoogleN1 > 0 ? row.googleN1 / row.countGoogleN1 : null,
      });
    });

    const monthTotals = {
      heuresPersonnel: monthTotalsRaw.heuresPersonnel || null,
      heuresPersonnelN1: monthTotalsRaw.heuresPersonnelN1 || null,
      heuresTravail: monthTotalsRaw.heuresTravail || null,
      heuresTravailN1: monthTotalsRaw.heuresTravailN1 || null,
      tauxHoraire:
        monthTotalsRaw.countTauxHoraire > 0
          ? monthTotalsRaw.tauxHoraire / monthTotalsRaw.countTauxHoraire
          : null,
      tauxHoraireN1:
        monthTotalsRaw.countTauxHoraireN1 > 0
          ? monthTotalsRaw.tauxHoraireN1 / monthTotalsRaw.countTauxHoraireN1
          : null,
      osat: monthTotalsRaw.countOsat > 0 ? monthTotalsRaw.osat / monthTotalsRaw.countOsat : null,
      osatN1:
        monthTotalsRaw.countOsatN1 > 0 ? monthTotalsRaw.osatN1 / monthTotalsRaw.countOsatN1 : null,
      gxi: monthTotalsRaw.countGxi > 0 ? monthTotalsRaw.gxi / monthTotalsRaw.countGxi : null,
      gxiN1:
        monthTotalsRaw.countGxiN1 > 0 ? monthTotalsRaw.gxiN1 / monthTotalsRaw.countGxiN1 : null,
      google:
        monthTotalsRaw.countGoogle > 0 ? monthTotalsRaw.google / monthTotalsRaw.countGoogle : null,
      googleN1:
        monthTotalsRaw.countGoogleN1 > 0
          ? monthTotalsRaw.googleN1 / monthTotalsRaw.countGoogleN1
          : null,
    };

    return { byDate: byDateComputed, monthTotals };
  }, [filteredItems]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mb-2">Récap mensuel BK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Une ligne par jour + cumul par semaine et total du mois (toutes les colonnes Excel).
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
            {loading && <div className="text-xs text-muted-foreground">Chargement...</div>}
          </div>
        </div>

        {err && <div className="text-sm text-destructive whitespace-pre-wrap">{err}</div>}

        <div className="rounded-md border">
          <Table
            containerClassName="overflow-x-auto overflow-y-visible"
            className="min-w-max [&_th]:px-4 [&_td]:px-4 [&_th]:py-3 [&_td]:py-2 [&_th+th]:border-l [&_td+td]:border-l [&_th+th]:border-border/70 [&_td+td]:border-border/40 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap"
          >
            <TableHeader className="sticky top-0 z-20 bg-background shadow-sm [&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-background">
              <TableRow>
                <TableHead>Jour</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Commentaire N-1</TableHead>
                <TableHead>Commentaire</TableHead>
                <TableHead className="text-right">N-1 HT</TableHead>
                <TableHead className="text-right">Var N-1</TableHead>
                <TableHead className="text-right">Prev HT</TableHead>
                <TableHead className="text-right">% Prev vs N-1</TableHead>
                <TableHead className={`text-right ${colCaClass}`}>CA real</TableHead>
                <TableHead className={`text-right ${colCaClass}`}>% N-1</TableHead>
                <TableHead className="text-right">Écart Prev</TableHead>
                <TableHead className="text-right">Écart Prev %</TableHead>
                <TableHead className={`text-right ${colClientsClass}`}>Clients</TableHead>
                <TableHead className="text-right">Clients N-1</TableHead>
                <TableHead className={`text-right ${colClientsClass}`}>% N-1</TableHead>
                <TableHead className="text-right">MP</TableHead>
                <TableHead className="text-right">MP N-1</TableHead>
                <TableHead className={`text-right ${colMpClass}`}>% N-1</TableHead>
                <TableHead className="text-right">CA delivery</TableHead>
                <TableHead className="text-right">CA delivery N-1</TableHead>
                <TableHead className="text-right">% N-1</TableHead>
                <TableHead className="text-right">Client delivery</TableHead>
                <TableHead className="text-right">Client delivery N-1</TableHead>
                <TableHead className="text-right">% N-1</TableHead>
                <TableHead className="text-right">MP delivery</TableHead>
                <TableHead className="text-right">MP N-1</TableHead>
                <TableHead className="text-right">% N-1</TableHead>
                <TableHead className="text-right">% CA</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>CA Clic N Collect</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>CNC N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>% N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>Client</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>Client N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>% N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>MP</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>MP N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>% N-1</TableHead>
                <TableHead className={`text-right ${colCncClass}`}>% CA CNC</TableHead>
                <TableHead className="text-right">Écart caisse</TableHead>
                <TableHead className="text-right">Écart caisse % CA</TableHead>
                <TableHead className="text-right">Heures personnel</TableHead>
                <TableHead className="text-right">Heures personnel N-1</TableHead>
                <TableHead className="text-right">Heures formation</TableHead>
                <TableHead className="text-right">Heures formation N-1</TableHead>
                <TableHead className="text-right">Taux horaire (EUR)</TableHead>
                <TableHead className="text-right">Taux horaire N-1 (EUR)</TableHead>
                <TableHead className="text-right">OSAT (%)</TableHead>
                <TableHead className="text-right">OSAT N-1 (%)</TableHead>
                <TableHead className="text-right">GXI</TableHead>
                <TableHead className="text-right">GXI N-1</TableHead>
                <TableHead className="text-right">Google</TableHead>
                <TableHead className="text-right">Google N-1</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={50} className="text-sm text-muted-foreground">
                    Aucun rapport pour ce mois.
                  </TableCell>
                </TableRow>
              ) : (
                dayRows.map((row, index) => {
                  const calc = calcRow(row);
                  if (row.type === "week") {
                    return (
                      <TableRow key={`${row.label}-${index}`} className="bg-muted/30">
                        <TableCell className="font-medium" colSpan={4}>
                          {row.label}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.n1_ht, row.ca_real)}`}>
                          {formatMoney(row.n1_ht)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(row.var_n1)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(row.prev_ht)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.prev_vs_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${colCaClass} ${compareClass(row.ca_real, row.n1_ht)}`}>
                          {formatMoney(row.ca_real)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCaClass}`}>{formatPercent(calc.ca_vs_n1)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(calc.ecart_prev)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.ecart_prev_pct)}</TableCell>
                        <TableCell className={`text-right font-medium ${colClientsClass} ${compareClass(row.clients, row.clients_n1)}`}>
                          {formatInt(row.clients)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.clients_n1, row.clients)}`}>
                          {formatInt(row.clients_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colClientsClass}`}>{formatPercent(calc.clients_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(calc.mp, calc.mp_n1)}`}>
                          {formatMoney(calc.mp)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(calc.mp_n1, calc.mp)}`}>
                          {formatMoney(calc.mp_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colMpClass}`}>{formatPercent(calc.mp_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.ca_delivery, row.ca_delivery_n1)}`}>
                          {formatMoney(row.ca_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.ca_delivery_n1, row.ca_delivery)}`}>
                          {formatMoney(row.ca_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.ca_delivery_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.client_delivery, row.client_delivery_n1)}`}>
                          {formatInt(row.client_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(row.client_delivery_n1, row.client_delivery)}`}>
                          {formatInt(row.client_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.client_delivery_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(calc.mp_delivery, calc.mp_delivery_n1)}`}>
                          {formatMoney(calc.mp_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${compareClass(calc.mp_delivery_n1, calc.mp_delivery)}`}>
                          {formatMoney(calc.mp_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.mp_delivery_pct_n1)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.pct_ca_delivery)}</TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(row.ca_click_collect, row.cnc_n1)}`}>
                          {formatMoney(row.ca_click_collect)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(row.cnc_n1, row.ca_click_collect)}`}>
                          {formatMoney(row.cnc_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass}`}>{formatPercent(calc.cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(row.client_click_collect, row.client_n1)}`}>
                          {formatInt(row.client_click_collect)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(row.client_n1, row.client_click_collect)}`}>
                          {formatInt(row.client_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass}`}>{formatPercent(calc.client_cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(calc.mp_cnc, calc.mp_cnc_n1)}`}>
                          {formatMoney(calc.mp_cnc)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass} ${compareClass(calc.mp_cnc_n1, calc.mp_cnc)}`}>
                          {formatMoney(calc.mp_cnc_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass}`}>{formatPercent(calc.mp_cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-medium ${colCncClass}`}>{formatPercent(calc.pct_ca_cnc)}</TableCell>
                        <TableCell className="text-right font-medium">{formatMoney(row.cash_diff)}</TableCell>
                        <TableCell className="text-right font-medium">{formatPercent(calc.cash_diff_pct_ca)}</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                        <TableCell className="text-right font-medium">—</TableCell>
                      </TableRow>
                    );
                  }

                  const isToday = row.date === todayIso;
                  const workforce = workforceStats.byDate.get(row.date);
                  return (
                    <TableRow key={row.date} className={isToday ? "bg-primary/5 ring-2 ring-primary/30 ring-inset" : undefined}>
                      <TableCell className="capitalize">{row.weekday}</TableCell>
                      <TableCell className="font-mono text-xs">{row.label}</TableCell>
                      <TableCell
                        className="max-w-[220px] truncate text-xs text-muted-foreground"
                        title={row.comment_n1 || ""}
                      >
                        {row.comment_n1 || "—"}
                      </TableCell>
                      <TableCell
                        className="max-w-[220px] truncate text-xs text-muted-foreground"
                        title={row.comment || ""}
                      >
                        {row.comment || "—"}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(row.n1_ht, row.ca_real)}`}>
                        {formatMoney(row.n1_ht)}
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(row.var_n1)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.prev_ht)}</TableCell>
                      <TableCell className="text-right">{formatPercent(calc.prev_vs_n1)}</TableCell>
                      <TableCell className={`text-right ${colCaClass} ${compareClass(row.ca_real, row.n1_ht)}`}>
                        {formatMoney(row.ca_real)}
                      </TableCell>
                      <TableCell className={`text-right ${colCaClass}`}>{formatPercent(calc.ca_vs_n1)}</TableCell>
                      <TableCell className="text-right">{formatMoney(calc.ecart_prev)}</TableCell>
                      <TableCell className="text-right">{formatPercent(calc.ecart_prev_pct)}</TableCell>
                      <TableCell className={`text-right ${colClientsClass} ${compareClass(row.clients, row.clients_n1)}`}>
                        {formatInt(row.clients)}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(row.clients_n1, row.clients)}`}>
                        {formatInt(row.clients_n1)}
                      </TableCell>
                      <TableCell className={`text-right ${colClientsClass}`}>{formatPercent(calc.clients_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${compareClass(calc.mp, calc.mp_n1)}`}>
                        {formatMoney(calc.mp)}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(calc.mp_n1, calc.mp)}`}>
                        {formatMoney(calc.mp_n1)}
                      </TableCell>
                      <TableCell className={`text-right ${colMpClass}`}>{formatPercent(calc.mp_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${compareClass(row.ca_delivery, row.ca_delivery_n1)}`}>
                        {formatMoney(row.ca_delivery)}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(row.ca_delivery_n1, row.ca_delivery)}`}>
                        {formatMoney(row.ca_delivery_n1)}
                      </TableCell>
                      <TableCell className="text-right">{formatPercent(calc.ca_delivery_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${compareClass(row.client_delivery, row.client_delivery_n1)}`}>
                        {formatInt(row.client_delivery)}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(row.client_delivery_n1, row.client_delivery)}`}>
                        {formatInt(row.client_delivery_n1)}
                      </TableCell>
                      <TableCell className="text-right">{formatPercent(calc.client_delivery_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${compareClass(calc.mp_delivery, calc.mp_delivery_n1)}`}>
                        {formatMoney(calc.mp_delivery)}
                      </TableCell>
                      <TableCell className={`text-right ${compareClass(calc.mp_delivery_n1, calc.mp_delivery)}`}>
                        {formatMoney(calc.mp_delivery_n1)}
                      </TableCell>
                      <TableCell className="text-right">{formatPercent(calc.mp_delivery_pct_n1)}</TableCell>
                      <TableCell className="text-right">{formatPercent(calc.pct_ca_delivery)}</TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(row.ca_click_collect, row.cnc_n1)}`}>
                        {formatMoney(row.ca_click_collect)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(row.cnc_n1, row.ca_click_collect)}`}>
                        {formatMoney(row.cnc_n1)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass}`}>{formatPercent(calc.cnc_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(row.client_click_collect, row.client_n1)}`}>
                        {formatInt(row.client_click_collect)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(row.client_n1, row.client_click_collect)}`}>
                        {formatInt(row.client_n1)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass}`}>{formatPercent(calc.client_cnc_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(calc.mp_cnc, calc.mp_cnc_n1)}`}>
                        {formatMoney(calc.mp_cnc)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass} ${compareClass(calc.mp_cnc_n1, calc.mp_cnc)}`}>
                        {formatMoney(calc.mp_cnc_n1)}
                      </TableCell>
                      <TableCell className={`text-right ${colCncClass}`}>{formatPercent(calc.mp_cnc_pct_n1)}</TableCell>
                      <TableCell className={`text-right ${colCncClass}`}>{formatPercent(calc.pct_ca_cnc)}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.cash_diff)}</TableCell>
                      <TableCell className="text-right">{formatPercent(calc.cash_diff_pct_ca)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.heuresPersonnel ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.heuresPersonnelN1 ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.heuresTravail ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.heuresTravailN1 ?? null)}</TableCell>
                      <TableCell className="text-right">{formatMoney(workforce?.tauxHoraire ?? null)}</TableCell>
                      <TableCell className="text-right">{formatMoney(workforce?.tauxHoraireN1 ?? null)}</TableCell>
                      <TableCell className="text-right">{formatPercent(workforce?.osat !== null && workforce?.osat !== undefined ? workforce.osat / 100 : null)}</TableCell>
                      <TableCell className="text-right">{formatPercent(workforce?.osatN1 !== null && workforce?.osatN1 !== undefined ? workforce.osatN1 / 100 : null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.gxi ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.gxiN1 ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.google ?? null)}</TableCell>
                      <TableCell className="text-right">{formatInt(workforce?.googleN1 ?? null)}</TableCell>
                    </TableRow>
                  );
                })
              )}

              {dayRows.length > 0 && (
                <TableRow className="bg-primary/5">
                  <TableCell className="font-semibold" colSpan={4}>
                    {(() => {
                      if (!month) return "Total mois";
                      const [yearStr, monthStr] = month.split("-");
                      const year = Number(yearStr);
                      const monthNum = Number(monthStr);
                      if (!year || !monthNum) return "Total mois";
                      const label = monthNameFmt.format(new Date(year, monthNum - 1, 1));
                      return `Total ${label} ${year}`;
                    })()}
                  </TableCell>
                  {(() => {
                    const calc = calcRow({
                      type: "day",
                      date: "",
                      weekday: "",
                      label: "",
                      comment: null,
                      comment_n1: null,
                      ...monthTotals,
                    });
                    return (
                      <>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.n1_ht, monthTotals.ca_real)}`}>
                          {formatMoney(monthTotals.n1_ht)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(monthTotals.var_n1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(monthTotals.prev_ht)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.prev_vs_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colCaClass} ${compareClass(monthTotals.ca_real, monthTotals.n1_ht)}`}>
                          {formatMoney(monthTotals.ca_real)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCaClass}`}>{formatPercent(calc.ca_vs_n1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(calc.ecart_prev)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.ecart_prev_pct)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colClientsClass} ${compareClass(monthTotals.clients, monthTotals.clients_n1)}`}>
                          {formatInt(monthTotals.clients)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.clients_n1, monthTotals.clients)}`}>
                          {formatInt(monthTotals.clients_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colClientsClass}`}>{formatPercent(calc.clients_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(calc.mp, calc.mp_n1)}`}>
                          {formatMoney(calc.mp)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(calc.mp_n1, calc.mp)}`}>
                          {formatMoney(calc.mp_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colMpClass}`}>{formatPercent(calc.mp_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.ca_delivery, monthTotals.ca_delivery_n1)}`}>
                          {formatMoney(monthTotals.ca_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.ca_delivery_n1, monthTotals.ca_delivery)}`}>
                          {formatMoney(monthTotals.ca_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.ca_delivery_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.client_delivery, monthTotals.client_delivery_n1)}`}>
                          {formatInt(monthTotals.client_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(monthTotals.client_delivery_n1, monthTotals.client_delivery)}`}>
                          {formatInt(monthTotals.client_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.client_delivery_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(calc.mp_delivery, calc.mp_delivery_n1)}`}>
                          {formatMoney(calc.mp_delivery)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${compareClass(calc.mp_delivery_n1, calc.mp_delivery)}`}>
                          {formatMoney(calc.mp_delivery_n1)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.mp_delivery_pct_n1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.pct_ca_delivery)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(monthTotals.ca_click_collect, monthTotals.cnc_n1)}`}>
                          {formatMoney(monthTotals.ca_click_collect)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(monthTotals.cnc_n1, monthTotals.ca_click_collect)}`}>
                          {formatMoney(monthTotals.cnc_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass}`}>{formatPercent(calc.cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(monthTotals.client_click_collect, monthTotals.client_n1)}`}>
                          {formatInt(monthTotals.client_click_collect)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(monthTotals.client_n1, monthTotals.client_click_collect)}`}>
                          {formatInt(monthTotals.client_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass}`}>{formatPercent(calc.client_cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(calc.mp_cnc, calc.mp_cnc_n1)}`}>
                          {formatMoney(calc.mp_cnc)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass} ${compareClass(calc.mp_cnc_n1, calc.mp_cnc)}`}>
                          {formatMoney(calc.mp_cnc_n1)}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass}`}>{formatPercent(calc.mp_cnc_pct_n1)}</TableCell>
                        <TableCell className={`text-right font-semibold ${colCncClass}`}>{formatPercent(calc.pct_ca_cnc)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(monthTotals.cash_diff)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(calc.cash_diff_pct_ca)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.heuresPersonnel)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.heuresPersonnelN1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.heuresTravail)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.heuresTravailN1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(workforceStats.monthTotals.tauxHoraire)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatMoney(workforceStats.monthTotals.tauxHoraireN1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(workforceStats.monthTotals.osat !== null ? workforceStats.monthTotals.osat / 100 : null)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatPercent(workforceStats.monthTotals.osatN1 !== null ? workforceStats.monthTotals.osatN1 / 100 : null)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.gxi)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.gxiN1)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.google)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatInt(workforceStats.monthTotals.googleN1)}</TableCell>
                      </>
                    );
                  })()}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
