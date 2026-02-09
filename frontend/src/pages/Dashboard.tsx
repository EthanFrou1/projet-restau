import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, Database, LayoutDashboard, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { logout, listUsers, createUser, deleteUser } from "@/lib/auth";
import { BkReportUploader } from "@/components/bk/BkReportUploader";
import { BkReportView } from "@/components/bk/BkReportView";
import { BkReportBrowser } from "@/components/bk/BkReportBrowser";
import { BkMonthlyRecap } from "@/components/bk/BkMonthlyRecap";
import { BkComparison } from "@/components/bk/BkComparison";
import { apiFetch } from "@/lib/api";
import type { BKReport } from "@/components/bk/types";
import { getMyRestaurants, listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";
import { RestaurantManager } from "@/components/admin/RestaurantManager";
import { UserRestaurantAssign } from "@/components/admin/UserRestaurantAssign";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DailyImportBanner } from "@/components/dashboard/DailyImportBanner";
import type { ReimportRequest } from "@/components/bk/uploader/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Me = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};
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

type Restaurant = { id: number; code: string; name: string };
type ReportListItem = {
  id: number;
  restaurant_code: string;
  report_date: string;
  created_at: string;
};

type TabValue = "overview" | "data" | "bk-global" | "bk-monthly" | "bk-compare" | "dev";
type DashScope = "year" | "month" | "day";

const moneyFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const compactMoneyFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
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

export default function DashboardPage({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<BKReport | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const [devUsers, setDevUsers] = useState<Array<{
    id: number;
    email: string;
    role: string;
    is_active: boolean;
    first_name?: string | null;
    last_name?: string | null;
  }>>([]);
  const [devUsersLoading, setDevUsersLoading] = useState(false);
  const [devUsersPage, setDevUsersPage] = useState(1);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "READONLY" | "DEV">("READONLY");
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: number; label: string } | null>(null);
  const [assocUsers, setAssocUsers] = useState<
    Array<{
      id: number;
      email: string;
      role: string;
      is_active: boolean;
      first_name?: string | null;
      last_name?: string | null;
      restaurants: Array<{ id: number; code: string; name: string }>;
    }>
  >([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocMsg, setAssocMsg] = useState<string | null>(null);
  const [dashYear, setDashYear] = useState(String(new Date().getFullYear()));
  const [dashMonth, setDashMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [dashScope, setDashScope] = useState<DashScope>("month");
  const [dashDayFrom, setDashDayFrom] = useState(String(new Date().getDate()).padStart(2, "0"));
  const [dashDayTo, setDashDayTo] = useState(String(new Date().getDate()).padStart(2, "0"));
  const [dashRestaurant, setDashRestaurant] = useState("");
  const [dashItems, setDashItems] = useState<MonthlyItem[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErr, setDashErr] = useState<string | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [dailyStatus, setDailyStatus] = useState<{
    loading: boolean;
    missing: Restaurant[];
    date: string | null;
    error: string | null;
    noRestaurants: boolean;
  }>({ loading: false, missing: [], date: null, error: null, noRestaurants: false });
  const [pendingReimport, setPendingReimport] = useState<ReimportRequest | null>(null);

  async function loadMe() {
    setErr(null);
    const data = await apiFetch<Me>("/auth/me");
    setMe(data);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadMe();
        const rs = await getMyRestaurants();
        setRestaurants(rs);
      } catch (e: any) {
        setErr(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const roleBadge = useMemo(() => {
    if (!me) return null;
    return <Badge variant="secondary">{me.role}</Badge>;
  }, [me]);

  const displayName = useMemo(() => {
    if (!me) return "";
    const full = `${me.first_name || ""} ${me.last_name || ""}`.trim();
    return full || me.email;
  }, [me]);

  const isDev = me?.role === "DEV";
  const canImportData = me?.role === "MANAGER" || me?.role === "ADMIN" || me?.role === "DEV";
  const canSeeDailyBanner = me?.role === "MANAGER" || me?.role === "DEV";
  const canViewGlobalBk =
    me?.role === "MANAGER" || me?.role === "ADMIN" || me?.role === "DEV" || me?.role === "READONLY";
  const canReimportFromHistory = me?.role === "MANAGER" || me?.role === "ADMIN" || me?.role === "DEV";
  const canReplaceImport = me?.role === "MANAGER" || me?.role === "ADMIN" || me?.role === "DEV";
  const containerClass = "mx-auto w-full space-y-6";
  const pageSize = 10;
  const totalUserPages = Math.max(1, Math.ceil(devUsers.length / pageSize));
  const usersPageStart = (devUsersPage - 1) * pageSize;
  const usersPageItems = devUsers.slice(usersPageStart, usersPageStart + pageSize);
  const navItems = useMemo(
    () =>
      [
        { value: "overview", label: "Dashboard", icon: LayoutDashboard },
        canImportData ? { value: "data", label: "Mes imports", icon: Database } : null,
        canViewGlobalBk ? { value: "bk-global", label: "Historiques des imports", icon: BarChart3 } : null,
        canViewGlobalBk ? { value: "bk-monthly", label: "BK mensuel", icon: BarChart3 } : null,
        canViewGlobalBk ? { value: "bk-compare", label: "Comparaison", icon: BarChart3 } : null,
        isDev ? { value: "dev", label: "Dev", icon: Shield } : null,
      ].filter(
        (
          item
        ): item is {
          value: TabValue;
          label: string;
          icon: typeof LayoutDashboard;
        } => Boolean(item)
      ),
    [canImportData, canViewGlobalBk, isDev]
  );
  const activeTabLabel = useMemo(
    () => navItems.find((item) => item.value === activeTab)?.label ?? "Dashboard",
    [activeTab, navItems]
  );
  const activeTabDescription = useMemo(() => {
    if (activeTab === "overview") {
      return `${displayName ? `Bonjour ${displayName} ! ` : ""}Ici tu retrouves ton accès et tes données quotidiennes.`;
    }
    if (activeTab === "data") {
      return "Suis les imports à faire aujourd'hui, traite les retards par date, puis valide les CSV restaurant par restaurant.";
    }
    if (activeTab === "bk-global") {
      return "Retrouve la liste des imports réalisés et relance un réimport si nécessaire.";
    }
    if (activeTab === "bk-monthly") {
      return "Consulte le récapitulatif mensuel détaillé avec les indicateurs de comparaison.";
    }
    if (activeTab === "bk-compare") {
      return "Compare deux périodes pour suivre les écarts de performance par indicateur.";
    }
    if (activeTab === "dev") {
      return "Administre les utilisateurs, les rôles et les associations restaurants.";
    }
    return "";
  }, [activeTab, displayName]);

  async function loadDevUsers() {
    setDevUsersLoading(true);
    try {
      const data = await listUsers();
      setDevUsers(data);
      setDevUsersPage(1);
    } finally {
      setDevUsersLoading(false);
    }
  }

  async function loadUserRestaurants() {
    setAssocLoading(true);
    setAssocMsg(null);
    try {
      const data = await listUsersWithRestaurants();
      setAssocUsers(data);
    } catch (e: any) {
      setAssocMsg(e?.message ?? "Erreur chargement associations");
    } finally {
      setAssocLoading(false);
    }
  }

  useEffect(() => {
    if (isDev) {
      loadDevUsers();
      loadUserRestaurants();
    }
  }, [isDev]);

  useEffect(() => {
    const devTabHidden = activeTab === "dev" && !isDev;
    const dataTabHidden = activeTab === "data" && !canImportData;
    const globalTabHidden =
      (activeTab === "bk-global" || activeTab === "bk-monthly" || activeTab === "bk-compare") &&
      !canViewGlobalBk;
    if (devTabHidden || dataTabHidden || globalTabHidden) {
      setActiveTab("overview");
    }
  }, [activeTab, canImportData, canViewGlobalBk, isDev]);

  function updateAssocUser(userId: number, nextCodes: string[]) {
    setAssocUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              restaurants: nextCodes
                .map((code) => u.restaurants.find((r) => r.code === code))
                .filter((r): r is { id: number; code: string; name: string } => Boolean(r))
                .concat(
                  nextCodes
                    .filter((code) => !u.restaurants.find((r) => r.code === code))
                    .map((code) => ({ id: 0, code, name: code }))
                ),
            }
          : u
      )
    );
  }

  useEffect(() => {
    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum) return;
    if ((dashScope === "month" || dashScope === "day") && !monthNum) return;
    const restaurantCode = dashRestaurant.trim().toUpperCase();

    async function fetchMonthly(year: number, month: number) {
      const params = new URLSearchParams();
      params.set("year", String(year));
      params.set("month", String(month));
      if (restaurantCode) params.set("restaurant_code", restaurantCode);
      return apiFetch<MonthlyItem[]>(`/reports/bk/monthly?${params.toString()}`);
    }

    (async () => {
      setDashLoading(true);
      setDashErr(null);
      try {
        if (dashScope === "year") {
          const months = Array.from({ length: 12 }, (_, i) => i + 1);
          const chunks = await Promise.all(months.map((m) => fetchMonthly(yearNum, m)));
          setDashItems(chunks.flat());
        } else {
          const data = await fetchMonthly(yearNum, monthNum);
          setDashItems(data);
        }
      } catch (e: any) {
        setDashErr(e?.message ?? "Erreur chargement dashboard");
      } finally {
        setDashLoading(false);
      }
    })();
  }, [dashScope, dashYear, dashMonth, dashRestaurant]);

  async function refreshDailyStatus() {
    if (!canImportData) return;
    if (!restaurants) return;
    const today = toIsoDate(new Date());
    if (restaurants.length === 0) {
      setDailyStatus({
        loading: false,
        missing: [],
        date: today,
        error: null,
        noRestaurants: true,
      });
      return;
    }
    setDailyStatus((prev) => ({ ...prev, loading: true, error: null, date: today }));
    try {
      const params = new URLSearchParams();
      params.set("start_date", today);
      params.set("end_date", today);
      const data = await apiFetch<ReportListItem[]>(
        `/reports/bk?${params.toString()}`
      );
      const reported = new Set(data.map((r) => r.restaurant_code));
      const missing = restaurants.filter((r) => !reported.has(r.code));
      setDailyStatus({ loading: false, missing, date: today, error: null, noRestaurants: false });
    } catch (e: any) {
      setDailyStatus({
        loading: false,
        missing: [],
        date: today,
        error: e?.message ?? "Erreur chargement import du jour",
        noRestaurants: false,
      });
    }
  }

  useEffect(() => {
    refreshDailyStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canImportData, restaurants]);

  const importsTodoCount = canImportData ? dailyStatus.missing.length : 0;

  const monthLabel = useMemo(() => {
    const monthIdx = Number(dashMonth) - 1;
    if (monthIdx < 0 || monthIdx > 11) return "";
    return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
      new Date(Number(dashYear), monthIdx, 1)
    );
  }, [dashMonth, dashYear]);
  const periodLabel = useMemo(() => {
    if (dashScope === "year") return `année ${dashYear}`;
    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      const start = String(Math.min(from || 1, to || 1)).padStart(2, "0");
      const end = String(Math.max(from || 1, to || 1)).padStart(2, "0");
      return `${start}/${dashMonth}/${dashYear} - ${end}/${dashMonth}/${dashYear}`;
    }
    return `${monthLabel} ${dashYear}`;
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, monthLabel]);
  const filtersSummary = useMemo(() => {
    const selectedRestaurant = restaurants.find((r) => r.code === dashRestaurant);
    const restaurantLabel = selectedRestaurant
      ? `${selectedRestaurant.code} - ${selectedRestaurant.name}`
      : "tous les magasins";

    if (dashScope === "year") {
      return `Voici les données de ${restaurantLabel} sur l'année ${dashYear}.`;
    }

    if (dashScope === "month") {
      return `Voici les données de ${restaurantLabel} sur ${monthLabel} ${dashYear}.`;
    }

    const from = Number(dashDayFrom);
    const to = Number(dashDayTo);
    const start = String(Math.min(from || 1, to || 1)).padStart(2, "0");
    const end = String(Math.max(from || 1, to || 1)).padStart(2, "0");
    if (start === end) {
      return `Voici les données de ${restaurantLabel} pour le ${start}/${dashMonth}/${dashYear}.`;
    }
    return `Voici les données de ${restaurantLabel} du ${start}/${dashMonth}/${dashYear} au ${end}/${dashMonth}/${dashYear}.`;
  }, [dashDayFrom, dashDayTo, dashMonth, dashRestaurant, dashScope, dashYear, monthLabel, restaurants]);

  const dayOptions = useMemo(() => {
    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return [];
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [dashMonth, dashYear]);
  const dayToOptions = useMemo(() => {
    const from = Number(dashDayFrom);
    if (!from) return dayOptions;
    return dayOptions.filter((day) => Number(day) >= from);
  }, [dashDayFrom, dayOptions]);

  useEffect(() => {
    if (dayOptions.length === 0) return;
    if (!dayOptions.includes(dashDayFrom)) setDashDayFrom(dayOptions[0]);
    if (!dayOptions.includes(dashDayTo)) setDashDayTo(dayOptions[0]);
  }, [dashDayFrom, dashDayTo, dayOptions]);

  useEffect(() => {
    const from = Number(dashDayFrom);
    const to = Number(dashDayTo);
    if (!from || !to) return;
    if (to < from) {
      setDashDayTo(dashDayFrom);
    }
  }, [dashDayFrom, dashDayTo]);

  const scopedDashItems = useMemo(() => {
    if (dashScope === "year") return dashItems;
    if (dashScope === "month") {
      const monthPrefix = `${dashYear}-${dashMonth}`;
      return dashItems.filter((item) => item.report_date.startsWith(monthPrefix));
    }
    const from = Number(dashDayFrom);
    const to = Number(dashDayTo);
    if (!from || !to) return [];
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const fromIso = `${dashYear}-${dashMonth}-${String(start).padStart(2, "0")}`;
    const toIso = `${dashYear}-${dashMonth}-${String(end).padStart(2, "0")}`;
    return dashItems.filter((item) => item.report_date >= fromIso && item.report_date <= toIso);
  }, [dashDayFrom, dashDayTo, dashItems, dashMonth, dashScope, dashYear]);

  const dashTotals = useMemo(() => {
    let ca = 0;
    let caN1 = 0;
    let clients = 0;
    let clientsN1 = 0;
    let caDelivery = 0;
    let caCnc = 0;
    for (const item of scopedDashItems) {
      const kpi = item.kpi;
      const caReal = kpi?.ca_real ?? item.ca_net_total ?? 0;
      ca += caReal;
      caN1 += kpi?.n1_ht ?? 0;
      clients += kpi?.clients ?? item.tac_total ?? 0;
      clientsN1 += kpi?.clients_n1 ?? 0;
      caDelivery += kpi?.ca_delivery ?? 0;
      caCnc += kpi?.ca_click_collect ?? 0;
    }
    const mp = clients ? ca / clients : 0;
    const mpN1 = clientsN1 ? caN1 / clientsN1 : 0;
    const caMagasin = Math.max(0, ca - caDelivery - caCnc);
    return { ca, caN1, clients, clientsN1, mp, mpN1, caDelivery, caCnc, caMagasin };
  }, [scopedDashItems]);

  const dashTrend = useMemo(() => {
    if (dashScope === "year") {
      const labels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Number(dashYear), i, 1))
      );
      const n = Array.from({ length: 12 }, () => 0);
      const n1 = Array.from({ length: 12 }, () => 0);
      for (const item of scopedDashItems) {
        const monthIdx = Number(item.report_date.slice(5, 7)) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;
        n[monthIdx] += item.kpi?.ca_real ?? item.ca_net_total ?? 0;
        n1[monthIdx] += item.kpi?.n1_ht ?? 0;
      }
      return { labels, n, n1 };
    }

    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      if (!from || !to) return { labels: [], n: [], n1: [] };
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const labels: string[] = [];
      const n: number[] = [];
      const n1: number[] = [];
      const byDate = new Map<string, { n: number; n1: number }>();
      for (const item of scopedDashItems) {
        const prev = byDate.get(item.report_date) || { n: 0, n1: 0 };
        prev.n += item.kpi?.ca_real ?? item.ca_net_total ?? 0;
        prev.n1 += item.kpi?.n1_ht ?? 0;
        byDate.set(item.report_date, prev);
      }
      for (let d = start; d <= end; d += 1) {
        const day = String(d).padStart(2, "0");
        const iso = `${dashYear}-${dashMonth}-${day}`;
        const values = byDate.get(iso) || { n: 0, n1: 0 };
        labels.push(day);
        n.push(values.n);
        n1.push(values.n1);
      }
      return { labels, n, n1 };
    }

    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return { labels: [], n: [], n1: [] };
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const byDate = new Map<string, MonthlyItem>();
    scopedDashItems.forEach((item) => byDate.set(item.report_date, item));
    const labels: string[] = [];
    const n: number[] = [];
    const n1: number[] = [];
    for (let d = 1; d <= lastDay; d += 1) {
      const iso = new Date(Date.UTC(yearNum, monthNum - 1, d)).toISOString().slice(0, 10);
      const item = byDate.get(iso);
      const caReal = item?.kpi?.ca_real ?? item?.ca_net_total ?? 0;
      const caN1 = item?.kpi?.n1_ht ?? 0;
      labels.push(String(d));
      n.push(caReal);
      n1.push(caN1);
    }
    return { labels, n, n1 };
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, scopedDashItems]);

  const trendChart = useMemo(() => {
    const padLeft = 56;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 34;
    const chartWidth = 640;
    const chartHeight = 240;
    const w = chartWidth - padLeft - padRight;
    const h = chartHeight - padTop - padBottom;
    const maxValue = Math.max(...dashTrend.n, ...dashTrend.n1, 1);
    const len = dashTrend.labels.length;
    const toPoints = (arr: number[]) =>
      arr.map((v, i) => {
        const x = padLeft + (w * i) / Math.max(1, len - 1);
        const y = padTop + h - (v / maxValue) * h;
        return { x, y, value: v };
      });
    const yTicks = [1, 0.5, 0].map((ratio) => ({
      ratio,
      y: padTop + h - h * ratio,
      value: compactMoneyFmt.format(maxValue * ratio),
    }));
    const maxTicks = 6;
    const stride = Math.max(1, Math.ceil(len / maxTicks));
    const xTickIdx = Array.from({ length: len }, (_, idx) => idx).filter(
      (idx) => idx === 0 || idx === len - 1 || idx % stride === 0
    );
    const xTicks = xTickIdx.map((idx) => ({
      idx,
      x: padLeft + (w * idx) / Math.max(1, len - 1),
      label: dashTrend.labels[idx] ?? "",
    }));
    const nPoints = toPoints(dashTrend.n);
    const n1Points = toPoints(dashTrend.n1);
    return {
      chartWidth,
      chartHeight,
      padLeft,
      padRight,
      padTop,
      padBottom,
      w,
      h,
      yTicks,
      xTicks,
      nPoints,
      n1Points,
      nLine: nPoints.map((p) => `${p.x},${p.y}`).join(" "),
      n1Line: n1Points.map((p) => `${p.x},${p.y}`).join(" "),
    };
  }, [dashTrend]);

  const hoveredTrend = useMemo(() => {
    if (hoveredTrendIndex === null) return null;
    const label = dashTrend.labels[hoveredTrendIndex];
    const n = dashTrend.n[hoveredTrendIndex];
    const n1 = dashTrend.n1[hoveredTrendIndex];
    const nPoint = trendChart.nPoints[hoveredTrendIndex];
    const n1Point = trendChart.n1Points[hoveredTrendIndex];
    if (
      label === undefined ||
      n === undefined ||
      n1 === undefined ||
      !nPoint ||
      !n1Point
    ) {
      return null;
    }
    return { label, n, n1, nPoint, n1Point };
  }, [dashTrend, hoveredTrendIndex, trendChart]);

  useEffect(() => {
    setHoveredTrendIndex(null);
  }, [dashScope, dashYear, dashMonth, dashDayFrom, dashDayTo, dashRestaurant]);

  const storeQuickView = useMemo(() => {
    const map = new Map<string, { code: string; name: string; ca: number; caN1: number; clients: number }>();
    restaurants.forEach((r) =>
      map.set(r.code, { code: r.code, name: r.name, ca: 0, caN1: 0, clients: 0 })
    );
    scopedDashItems.forEach((item) => {
      const entry = map.get(item.restaurant_code) || {
        code: item.restaurant_code,
        name: item.restaurant_code,
        ca: 0,
        caN1: 0,
        clients: 0,
      };
      const caReal = item.kpi?.ca_real ?? item.ca_net_total ?? 0;
      entry.ca += caReal;
      entry.caN1 += item.kpi?.n1_ht ?? 0;
      entry.clients += item.kpi?.clients ?? item.tac_total ?? 0;
      map.set(item.restaurant_code, entry);
    });
    return Array.from(map.values());
  }, [restaurants, scopedDashItems]);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  const pctChange = (value: number, prev: number) => {
    if (!prev) return null;
    return (value - prev) / prev;
  };

  async function handleCreateUser() {
    setCreateMsg(null);
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setCreateMsg("Email requis.");
      return;
    }
    if (newPassword.length < 8) {
      setCreateMsg("Mot de passe trop court (min 8).");
      return;
    }
    if (newPassword !== newPassword2) {
      setCreateMsg("Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      const res = await createUser({
        email,
        password: newPassword,
        role: newRole,
        first_name: newFirstName.trim() || null,
        last_name: newLastName.trim() || null,
      });
      setCreateMsg(`Utilisateur créé: ${res.email} (${res.role})`);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPassword("");
      setNewPassword2("");
      setNewRole("READONLY");
      await loadDevUsers();
    } catch (e: any) {
      setCreateMsg(`Erreur: ${e?.message ?? "Erreur création utilisateur"}`);
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      onLoggedOut();
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="md:flex md:min-h-screen md:items-start">
        <ConfirmDialog
          open={Boolean(confirmDeleteUser)}
          title="Supprimer cet utilisateur ?"
          description={
            confirmDeleteUser
              ? `Confirmer la suppression de ${confirmDeleteUser.label}. Cette action est irréversible.`
              : undefined
          }
          confirmLabel="Supprimer"
          onCancel={() => setConfirmDeleteUser(null)}
          onConfirm={async () => {
            if (!confirmDeleteUser) return;
            const userId = confirmDeleteUser.id;
            setConfirmDeleteUser(null);
            await deleteUser(userId);
            await loadDevUsers();
          }}
        />
        <DashboardSidebar
          activeTab={activeTab}
          navItems={navItems}
          me={me ? { role: me.role } : null}
          displayName={displayName}
          loading={loading}
          importsTodoCount={importsTodoCount}
          onTabChange={(tab) => setActiveTab(tab as TabValue)}
        />

        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <div className={`${containerClass} min-w-0`}>
            <DashboardHeader
              roleBadge={roleBadge}
              activeTabLabel={activeTabLabel}
              activeTabDescription={activeTabDescription}
              onLogout={handleLogout}
            />

            {err && (
              <Card className="border-destructive/40">
                <CardHeader>
                  <CardTitle className="text-destructive">Erreur</CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">{err}</CardContent>
              </Card>
            )}

            {/* Overview: KPI dashboard and analytics visualizations */}
            <TabsContent value="overview" className="space-y-4">
              <DailyImportBanner
                visible={canSeeDailyBanner}
                status={dailyStatus}
                onImportNow={() => setActiveTab("data")}
              />
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
                {dashErr && (
                  <div className="w-full text-sm text-destructive">{dashErr}</div>
                )}
                {dashLoading && (
                  <div className="w-full text-sm md:text-base text-muted-foreground">
                    Chargement du tableau de bord...
                  </div>
                )}
                <div className="w-full text-sm md:text-base text-muted-foreground">
                  {filtersSummary}
                </div>
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
                  <div className="text-sm md:text-base text-muted-foreground mb-3">
                    {periodLabel}
                  </div>
                  <div className="relative">
                    {hoveredTrend && (
                      <div className="absolute right-2 top-2 z-10 rounded-md border bg-background/95 px-3 py-2 text-sm md:text-base shadow-sm">
                        <div className="font-medium">
                          {dashScope === "year"
                            ? `${hoveredTrend.label} ${dashYear}`
                            : dashScope === "month"
                              ? `Jour ${hoveredTrend.label} - ${monthLabel} ${dashYear}`
                              : `${hoveredTrend.label}/${dashMonth}/${dashYear}`}
                        </div>
                        <div className="text-muted-foreground">N: {moneyFmt.format(hoveredTrend.n)}</div>
                        <div className="text-muted-foreground">N-1: {moneyFmt.format(hoveredTrend.n1)}</div>
                      </div>
                    )}
                    <svg
                      viewBox={`0 0 ${trendChart.chartWidth} ${trendChart.chartHeight}`}
                      className="w-full h-56"
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Répartition du CA par canal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {[
                      { label: "Magasin", value: dashTotals.caMagasin },
                      { label: "Delivery", value: dashTotals.caDelivery },
                      { label: "Click & Collect", value: dashTotals.caCnc },
                    ].map((row) => {
                      const max = Math.max(
                        dashTotals.caMagasin,
                        dashTotals.caDelivery,
                        dashTotals.caCnc,
                        1
                      );
                      const width = Math.round((row.value / max) * 100);
                      return (
                        <div key={row.label} className="space-y-1">
                          <div className="flex items-center justify-between text-sm md:text-base">
                            <span>{row.label}</span>
                            <span className="text-muted-foreground">
                              {compactMoneyFmt.format(row.value)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${width}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                    Vue rapide magasins - {periodLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {storeQuickView.map((store) => {
                  const change = pctChange(store.ca, store.caN1);
                  const mp = store.clients ? store.ca / store.clients : 0;
                  return (
                    <div
                      key={store.code}
                      className="rounded-lg border bg-background p-6 space-y-3 min-h-[150px]"
                    >
                      <div className="text-base font-semibold">
                        {store.code} - {store.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CA: {compactMoneyFmt.format(store.ca)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Clients: {intFmt.format(store.clients)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Panier: {moneyFmt.format(mp)}
                      </div>
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
                  <div className="text-sm text-muted-foreground">
                    Aucun restaurant disponible.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Data: operational imports (uploader + selected report preview) */}
          {canImportData && (
            <TabsContent value="data" className="space-y-4">
              <BkReportUploader
                restaurants={restaurants}
                canReplace={canReplaceImport}
                pendingReimport={pendingReimport}
                onPendingReimportHandled={() => setPendingReimport(null)}
                onUploaded={(r) => {
                  setReport(r);
                  refreshDailyStatus();
                }}
              />

              <BkReportView report={report} />
            </TabsContent>
          )}

          {/* Global BK browsing */}
          {canViewGlobalBk && (
            <TabsContent value="bk-global" className="space-y-4">
              <BkReportBrowser
                restaurants={restaurants}
                canReimport={canReimportFromHistory}
                onReimportRequest={(request) => {
                  setPendingReimport(request);
                  setActiveTab("data");
                }}
              />
            </TabsContent>
          )}

          {/* Monthly recap */}
          {canViewGlobalBk && (
            <TabsContent value="bk-monthly" className="space-y-4">
              <BkMonthlyRecap restaurants={restaurants} />
            </TabsContent>
          )}
          {/* Period comparison */}
          {canViewGlobalBk && (
            <TabsContent value="bk-compare" className="space-y-4">
              <BkComparison restaurants={restaurants} />
            </TabsContent>
          )}
          {/* Dev administration */}
          {isDev && (
          <TabsContent value="dev" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Utilisateurs (DEV)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {devUsersLoading && (
                  <div className="text-sm md:text-base text-muted-foreground">Chargement des utilisateurs...</div>
                )}
                <div className="grid gap-3 md:grid-cols-7">
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Prénom</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Nom</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Email</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@restau.com"
                    />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Mot de passe</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                    />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Confirmer</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      type="password"
                      value={newPassword2}
                      onChange={(e) => setNewPassword2(e.target.value)}
                      placeholder="Retaper le mot de passe"
                    />
                  </div>
                  <div>
                    <div className="text-sm md:text-base text-muted-foreground mb-1">Rôle</div>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                    >
                      <option value="READONLY">READONLY</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="DEV">DEV</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button onClick={handleCreateUser}>Créer</Button>
                  </div>
                </div>
                {createMsg && <div className="text-sm whitespace-pre-wrap">{createMsg}</div>}
                <div className="text-sm md:text-base text-muted-foreground">
                  {devUsers.length === 0
                    ? "Aucun utilisateur chargé."
                    : `${devUsers.length} utilisateur(s) chargé(s).`}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="w-[140px]">Prénom</TableHead>
                        <TableHead className="w-[140px]">Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[120px]">Rôle</TableHead>
                        <TableHead className="w-[120px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-sm text-muted-foreground">
                            Aucun utilisateur chargé.
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersPageItems.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>{u.id}</TableCell>
                            <TableCell>{u.first_name || "-"}</TableCell>
                            <TableCell>{u.last_name || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell>{u.is_active ? "yes" : "no"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={u.id === me?.id || u.role === "DEV"}
                                onClick={async () => {
                                  setConfirmDeleteUser({
                                    id: u.id,
                                    label: `${u.email} (id=${u.id})`,
                                  });
                                }}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {devUsers.length > pageSize && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={devUsersPage <= 1}
                      onClick={() => setDevUsersPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <div className="text-sm md:text-base text-muted-foreground">
                      Page {devUsersPage} / {totalUserPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={devUsersPage >= totalUserPages}
                      onClick={() => setDevUsersPage((p) => Math.min(totalUserPages, p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Associations utilisateurs ? restaurants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {assocLoading && (
                    <div className="text-sm md:text-base text-muted-foreground">Chargement.</div>
                  )}
                  {assocMsg && <div className="text-sm text-destructive">{assocMsg}</div>}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rle</TableHead>
                        <TableHead>Restaurants</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assocUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground">
                            Aucune association trouvée.
                          </TableCell>
                        </TableRow>
                      ) : (
                        assocUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono text-xs">
                              {u.first_name || u.last_name
                                ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                                : u.email}
                            </TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {u.restaurants.length === 0 ? (
                                  <span className="text-sm md:text-base text-muted-foreground">Aucun</span>
                                ) : (
                                  u.restaurants.map((r) => (
                                    <Button
                                      key={`${u.id}-${r.code}`}
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        if (u.restaurants.length <= 1) {
                                          setAssocMsg(
                                            "Impossible de retirer le dernier restaurant. Ajoute-en un autre d'abord."
                                          );
                                          return;
                                        }
                                        setAssocMsg(null);
                                        const nextCodes = u.restaurants
                                          .filter((x) => x.code !== r.code)
                                          .map((x) => x.code);
                                        try {
                                          await setUserRestaurants(u.id, nextCodes);
                                          updateAssocUser(u.id, nextCodes);
                                        } catch (e: any) {
                                          setAssocMsg(e?.message ?? "Erreur suppression association");
                                        }
                                      }}
                                    >
                                      {r.code} 
                                    </Button>
                                  ))
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-sm md:text-base text-muted-foreground">
                  Clique sur un restaurant pour le retirer. Pour ajouter, utilise le bloc ci-dessous.
                </div>
              </CardContent>
            </Card>

            <RestaurantManager />
          <UserRestaurantAssign
              users={devUsers}
              onSaved={(userId, codes) => updateAssocUser(userId, codes)}
            />
            </div>
          </TabsContent>
          )}
          </div>
        </main>
      </Tabs>
    </div>
  );
}
