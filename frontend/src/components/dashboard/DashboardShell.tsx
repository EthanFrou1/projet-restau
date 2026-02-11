import { useEffect, useMemo, useState } from "react";
import { BarChart3, Database, LayoutDashboard, Shield } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { logout, listUsers, createUser, deleteUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { BKReport } from "@/components/bk/types";
import { getMyRestaurants, listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ComparisonPage } from "@/pages/Comparaison";
import { DevPage } from "@/pages/Administration";
import { HistoryPage } from "@/pages/HistoriquesImports";
import { ImportsPage } from "@/pages/MesImports";
import { MonthlyPage } from "@/pages/BkMensuel";
import { OverviewPage } from "@/pages/Dashboard";
import type { ReimportRequest } from "@/components/bk/uploader/types";

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

const TAB_TO_PATH: Record<TabValue, string> = {
  overview: "/dashboard",
  data: "/mes-imports",
  "bk-global": "/historiques-imports",
  "bk-monthly": "/bk-mensuel",
  "bk-compare": "/comparaison",
  dev: "/administration",
};

function pathToTab(pathname: string): TabValue {
  if (pathname === "/mes-imports") return "data";
  if (pathname === "/historiques-imports") return "bk-global";
  if (pathname === "/bk-mensuel") return "bk-monthly";
  if (pathname === "/comparaison") return "bk-compare";
  if (pathname === "/dev" || pathname === "/administration") return "dev";
  return "overview";
}

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

export default function DashboardShell({ onLoggedOut }: { onLoggedOut: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<BKReport | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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
  const [confirmRemoveAssoc, setConfirmRemoveAssoc] = useState<{
    userId: number;
    userLabel: string;
    code: string;
    nextCodes: string[];
  } | null>(null);
  const [assocBusy, setAssocBusy] = useState(false);
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
  const activeTab = useMemo(() => pathToTab(location.pathname), [location.pathname]);

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
    return (
      <Badge
        variant="outline"
        className="border-slate-500/40 bg-gradient-to-b from-slate-800 via-slate-700 to-zinc-800 text-slate-100 h-8 px-4 py-2"
      >
        {me.role}
      </Badge>
    );
  }, [me]);

  const displayName = useMemo(() => {
    if (!me) return "";
    const full = `${me.first_name || ""} ${me.last_name || ""}`.trim();
    return full || me.email;
  }, [me]);

  const isDev = me?.role === "DEV";
  const isAdmin = me?.role === "ADMIN";
  const canAccessDev = isDev || isAdmin;
  const canDeleteUsers = isDev || isAdmin;
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
        canAccessDev ? { value: "dev", label: "Administration", icon: Shield } : null,
      ].filter(
        (
          item
        ): item is {
          value: TabValue;
          label: string;
          icon: typeof LayoutDashboard;
        } => Boolean(item)
      ),
    [canAccessDev, canImportData, canViewGlobalBk]
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
      if (isAdmin) {
        return "Administre les utilisateurs MANAGER/READONLY sur tes restaurants et leurs associations.";
      }
      return "Administre les utilisateurs, les rôles et les associations restaurants.";
    }
    return "";
  }, [activeTab, displayName, isAdmin]);

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
    if (canAccessDev) {
      loadDevUsers();
      loadUserRestaurants();
    }
  }, [canAccessDev]);

  useEffect(() => {
    const devTabHidden = activeTab === "dev" && !canAccessDev;
    const dataTabHidden = activeTab === "data" && !canImportData;
    const globalTabHidden =
      (activeTab === "bk-global" || activeTab === "bk-monthly" || activeTab === "bk-compare") &&
      !canViewGlobalBk;
    if (devTabHidden || dataTabHidden || globalTabHidden) {
      navigate(TAB_TO_PATH.overview, { replace: true });
    }
  }, [activeTab, canAccessDev, canImportData, canViewGlobalBk, navigate]);

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

  const channelBreakdown = useMemo(() => {
    const rows = [
      { label: "Magasin", value: dashTotals.caMagasin },
      { label: "Delivery", value: dashTotals.caDelivery },
      { label: "Click & Collect", value: dashTotals.caCnc },
    ];
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row) => ({
      ...row,
      share: total > 0 ? row.value / total : 0,
    }));
  }, [dashTotals.caCnc, dashTotals.caDelivery, dashTotals.caMagasin]);

  const channelMax = useMemo(
    () => Math.max(...channelBreakdown.map((row) => row.value), 1),
    [channelBreakdown]
  );

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

  const salesTrend = useMemo(() => {
    if (dashScope === "year") {
      const labels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Number(dashYear), i, 1))
      );
      const n = Array.from({ length: 12 }, () => 0);
      const n1 = Array.from({ length: 12 }, () => 0);
      for (const item of scopedDashItems) {
        const monthIdx = Number(item.report_date.slice(5, 7)) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;
        n[monthIdx] += item.kpi?.clients ?? item.tac_total ?? 0;
        n1[monthIdx] += item.kpi?.clients_n1 ?? 0;
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
        prev.n += item.kpi?.clients ?? item.tac_total ?? 0;
        prev.n1 += item.kpi?.clients_n1 ?? 0;
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
      const clients = item?.kpi?.clients ?? item?.tac_total ?? 0;
      const clientsN1 = item?.kpi?.clients_n1 ?? 0;
      labels.push(String(d));
      n.push(clients);
      n1.push(clientsN1);
    }
    return { labels, n, n1 };
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, scopedDashItems]);

  const basketTrend = useMemo(() => {
    const len = Math.min(dashTrend.labels.length, salesTrend.labels.length);
    const labels = dashTrend.labels.slice(0, len);
    const n = labels.map((_, idx) => {
      const clients = salesTrend.n[idx] ?? 0;
      const ca = dashTrend.n[idx] ?? 0;
      return clients > 0 ? ca / clients : 0;
    });
    const n1 = labels.map((_, idx) => {
      const clientsN1 = salesTrend.n1[idx] ?? 0;
      const caN1 = dashTrend.n1[idx] ?? 0;
      return clientsN1 > 0 ? caN1 / clientsN1 : 0;
    });
    return { labels, n, n1 };
  }, [dashTrend, salesTrend]);

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
    if (isAdmin && newRole !== "READONLY" && newRole !== "MANAGER") {
      setCreateMsg("Un admin peut uniquement créer des utilisateurs READONLY ou MANAGER.");
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
      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(TAB_TO_PATH[value as TabValue])}
        className="md:flex md:min-h-screen md:items-start"
      >
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
            await loadUserRestaurants();
          }}
        />
        <ConfirmDialog
          open={Boolean(confirmRemoveAssoc)}
          title="Supprimer cette association restaurant ?"
          description={
            confirmRemoveAssoc
              ? `Utilisateur: ${confirmRemoveAssoc.userLabel}\nRestaurant: ${confirmRemoveAssoc.code}`
              : undefined
          }
          confirmLabel="Supprimer"
          busy={assocBusy}
          onCancel={() => setConfirmRemoveAssoc(null)}
          onConfirm={async () => {
            if (!confirmRemoveAssoc) return;
            setAssocBusy(true);
            setAssocMsg(null);
            try {
              await setUserRestaurants(confirmRemoveAssoc.userId, confirmRemoveAssoc.nextCodes);
              updateAssocUser(confirmRemoveAssoc.userId, confirmRemoveAssoc.nextCodes);
            } catch (e: any) {
              setAssocMsg(e?.message ?? "Erreur suppression association");
            } finally {
              setAssocBusy(false);
              setConfirmRemoveAssoc(null);
            }
          }}
        />
        <DashboardSidebar
          activeTab={activeTab}
          navItems={navItems}
          me={me ? { role: me.role } : null}
          displayName={displayName}
          loading={loading}
          importsTodoCount={importsTodoCount}
          onTabChange={(tab) => navigate(TAB_TO_PATH[tab as TabValue])}
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

            <OverviewPage
              canSeeDailyBanner={canSeeDailyBanner}
              dailyStatus={dailyStatus}
              onImportNow={() => navigate(TAB_TO_PATH.data)}
              dashScope={dashScope}
              setDashScope={setDashScope}
              yearOptions={yearOptions}
              dashYear={dashYear}
              setDashYear={setDashYear}
              dashMonth={dashMonth}
              setDashMonth={setDashMonth}
              dashDayFrom={dashDayFrom}
              setDashDayFrom={setDashDayFrom}
              dashDayTo={dashDayTo}
              setDashDayTo={setDashDayTo}
              dayOptions={dayOptions}
              dayToOptions={dayToOptions}
              restaurants={restaurants}
              dashRestaurant={dashRestaurant}
              setDashRestaurant={setDashRestaurant}
              dashErr={dashErr}
              dashLoading={dashLoading}
              filtersSummary={filtersSummary}
              dashTotals={dashTotals}
              pctChange={pctChange}
              compactMoneyFmt={compactMoneyFmt}
              intFmt={intFmt}
              moneyFmt={moneyFmt}
              pctFmt={pctFmt}
              periodLabel={periodLabel}
              hoveredTrend={hoveredTrend}
              dashYearLabel={dashYear}
              monthLabel={monthLabel}
              dashMonthLabel={dashMonth}
              trendChart={trendChart}
              setHoveredTrendIndex={setHoveredTrendIndex}
              dashTrend={dashTrend}
              channelBreakdown={channelBreakdown}
              channelMax={channelMax}
              salesTrend={salesTrend}
              basketTrend={basketTrend}
              storeQuickView={storeQuickView}
            />

            <ImportsPage
              visible={canImportData}
              restaurants={restaurants}
              canReplaceImport={canReplaceImport}
              pendingReimport={pendingReimport}
              onPendingReimportHandled={() => setPendingReimport(null)}
              onUploaded={(r) => {
                setReport(r);
                refreshDailyStatus();
              }}
              report={report}
            />

            <HistoryPage
              visible={canViewGlobalBk}
              restaurants={restaurants}
              canReimportFromHistory={canReimportFromHistory}
              onReimportRequest={(request) => {
                setPendingReimport(request);
                navigate(TAB_TO_PATH.data);
              }}
            />

            <MonthlyPage visible={canViewGlobalBk} restaurants={restaurants} />
            <ComparisonPage visible={canViewGlobalBk} restaurants={restaurants} />

            <DevPage
              visible={canAccessDev}
              isDev={isDev}
              isAdmin={isAdmin}
              displayName={displayName}
              adminRestaurants={restaurants}
              devUsersLoading={devUsersLoading}
              newFirstName={newFirstName}
              setNewFirstName={setNewFirstName}
              newLastName={newLastName}
              setNewLastName={setNewLastName}
              newEmail={newEmail}
              setNewEmail={setNewEmail}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              newPassword2={newPassword2}
              setNewPassword2={setNewPassword2}
              newRole={newRole}
              setNewRole={setNewRole}
              handleCreateUser={handleCreateUser}
              createMsg={createMsg}
              devUsers={devUsers}
              usersPageItems={usersPageItems}
              meId={me?.id}
              onAskDeleteUser={(id, email) => {
                if (!canDeleteUsers) return;
                setConfirmDeleteUser({ id, label: `${email} (id=${id})` });
              }}
              pageSize={pageSize}
              devUsersPage={devUsersPage}
              totalUserPages={totalUserPages}
              onPrevUsersPage={() => setDevUsersPage((p) => Math.max(1, p - 1))}
              onNextUsersPage={() => setDevUsersPage((p) => Math.min(totalUserPages, p + 1))}
              assocLoading={assocLoading}
              assocMsg={assocMsg}
              assocUsers={assocUsers}
              onRemoveAssoc={async (u, code) => {
                const nextCodes = u.restaurants.filter((x) => x.code !== code).map((x) => x.code);
                const userLabel = (u.first_name || u.last_name)
                  ? `${u.first_name || ""} ${u.last_name || ""}`.trim()
                  : u.email;
                setConfirmRemoveAssoc({ userId: u.id, userLabel, code, nextCodes });
              }}
              onSavedAssign={(userId, codes) => updateAssocUser(userId, codes)}
            />
          </div>
        </main>
      </Tabs>
    </div>
  );
}







