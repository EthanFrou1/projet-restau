import { useEffect, useMemo, useState } from "react";
import {
  ChartColumnBig,
  ChartSpline,
  Database,
  LayoutDashboard,
  Shield,
  Table2,
  Target,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { logout, listUsers, createUser, deleteUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getMyRestaurants, listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusDialog } from "@/components/ui/status-dialog";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { OverviewFilters } from "@/components/dashboard/shell/OverviewFilters";
import { TAB_TO_PATH, compactMoneyFmt, intFmt, moneyFmt, pathToTab, pctFmt } from "@/components/dashboard/shell/constants";
import {
  formatIsoDayMonth,
  formatIsoDayMonthYear,
  getIsoWeekNumber,
  getIsoWeekStart,
  isoWeeksInYear,
  mergeComment,
  toIsoDate,
} from "@/components/dashboard/shell/utils";
import type { DashScope, Me, MonthlyItem, MonthlyResponse, PeriodN1, PrevItem, ReportListItem, Restaurant, TabValue } from "@/components/dashboard/shell/types";
import { ComparisonPage } from "@/pages/Comparaison";
import { DevPage } from "@/pages/Administration";
import { HistoryPage } from "@/pages/HistoriquesImports";
import { ImportsPage } from "@/pages/MesImports";
import { MonthlyPage } from "@/pages/BkMensuel";
import { OverviewPage } from "@/pages/Dashboard";
import { DirectionPage } from "@/pages/RevueDirection";
import { BudgetPage } from "@/pages/Budget";
import type { ReimportRequest } from "@/components/bk/uploader/types";
import type { AssocUser, DevUser, UserRole } from "@/components/admin/types";

type MessageError = { message?: string };

export default function DashboardShell({ onLoggedOut }: { onLoggedOut: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [devUsersLoading, setDevUsersLoading] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("READONLY");
  const [createUserDialog, setCreateUserDialog] = useState<{
    open: boolean;
    kind: "success" | "error";
    title: string;
    description: string;
  }>({
    open: false,
    kind: "success",
    title: "",
    description: "",
  });
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: number; label: string } | null>(null);
  const [confirmRemoveAssoc, setConfirmRemoveAssoc] = useState<{
    userId: number;
    userLabel: string;
    code: string;
    nextCodes: string[];
  } | null>(null);
  const [assocBusy, setAssocBusy] = useState(false);
  const [assocUsers, setAssocUsers] = useState<AssocUser[]>([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocMsg, setAssocMsg] = useState<string | null>(null);
  const [assocUsersPage, setAssocUsersPage] = useState(1);
  const [dashYear, setDashYear] = useState(String(new Date().getFullYear()));
  const [dashMonth, setDashMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [dashScope, setDashScope] = useState<DashScope>("week");
  const [dashWeek, setDashWeek] = useState(String(getIsoWeekNumber(new Date())).padStart(2, "0"));
  const [dashDayFrom, setDashDayFrom] = useState(String(new Date().getDate()).padStart(2, "0"));
  const [dashDayTo, setDashDayTo] = useState(String(new Date().getDate()).padStart(2, "0"));
  const todayIso = new Date().toISOString().slice(0, 10);
  const tomorrowIso = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const [dashCustomFrom, setDashCustomFrom] = useState(todayIso);
  const [dashCustomTo, setDashCustomTo] = useState(tomorrowIso);
  const [dashRestaurant, setDashRestaurant] = useState("");
  const [dashItems, setDashItems] = useState<MonthlyItem[]>([]);
  const [dashPeriodN1List, setDashPeriodN1List] = useState<PeriodN1[]>([]);
  const [dashPrevItems, setDashPrevItems] = useState<PrevItem[]>([]);
  const [dashRefreshTick, setDashRefreshTick] = useState(0);
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
  const [executiveExportSignal, setExecutiveExportSignal] = useState(0);
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
      } catch (error: unknown) {
        const e = error as MessageError;
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
        className="h-8 border-amber-100/35 bg-gradient-to-b from-[#4b1e12] via-[#5a2516] to-[#712b10] px-4 py-2 text-amber-50"
      >
        {me.role}
      </Badge>
    );/*  */
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
  const totalAssocPages = Math.max(1, Math.ceil(assocUsers.length / pageSize));
  const assocUsersPageStart = (assocUsersPage - 1) * pageSize;
  const assocUsersPageItems = assocUsers.slice(assocUsersPageStart, assocUsersPageStart + pageSize);

  useEffect(() => {
    setAssocUsersPage((prev) => Math.min(prev, totalAssocPages));
  }, [totalAssocPages]);
  const navItems = useMemo(
    () =>
      [
        { value: "overview", label: "Dashboard", icon: LayoutDashboard },
        canImportData ? { value: "data", label: "Mes imports", icon: Database } : null,
        canViewGlobalBk ? { value: "bk-global", label: "Historiques des imports", icon: ChartSpline } : null,
        canViewGlobalBk ? { value: "bk-monthly", label: "Tableau de données", icon: Table2 } : null,
        canViewGlobalBk ? { value: "executive", label: "Données globales", icon: ChartColumnBig } : null,
        canViewGlobalBk ? { value: "budget", label: "Budget", icon: Target } : null,
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
      return "";
    }
    if (activeTab === "data") {
      return "Suis les imports à faire aujourd'hui, traite les retards par date, puis valide les CSV restaurant par restaurant.";
    }
    if (activeTab === "bk-global") {
      return "Retrouve la liste des imports réalisés et relance un réimport si nécessaire.";
    }
    if (activeTab === "bk-monthly") {
      return "Consulte le tableau de données mensuel détaillé avec les indicateurs de comparaison.";
    }
    if (activeTab === "bk-compare") {
      return "Compare deux périodes pour suivre les écarts de performance par indicateur.";
    }
    if (activeTab === "executive") {
      return "Vue globale de pilotage avec comparatif restaurants et export PDF.";
    }
    if (activeTab === "dev") {
      if (isAdmin) {
        return "Administre les utilisateurs MANAGER/READONLY sur tes restaurants et leurs associations.";
      }
      return "Administre les utilisateurs, les rôles et les associations restaurants.";
    }
    return "";
  }, [activeTab, isAdmin]);
  async function loadDevUsers() {
    setDevUsersLoading(true);
    try {
      const data = await listUsers();
      setDevUsers(data);
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
      setAssocUsersPage(1);
    } catch (error: unknown) {
      const e = error as MessageError;
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
      (
        activeTab === "bk-global" ||
        activeTab === "bk-monthly" ||
        activeTab === "bk-compare" ||
        activeTab === "executive"
      ) &&
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
      return apiFetch<MonthlyResponse>(`/reports/bk/monthly?${params.toString()}`);
    }

    (async () => {
      setDashLoading(true);
      setDashErr(null);
      try {
        if (dashScope === "year" || dashScope === "week") {
          const months = Array.from({ length: 12 }, (_, i) => i + 1);
          const chunks = await Promise.all(months.map((m) => fetchMonthly(yearNum, m)));
          setDashItems(chunks.flatMap((r) => r.items));
          setDashPeriodN1List(chunks.map((r) => r.period_n1));
          setDashPrevItems(chunks.flatMap((r) => r.prev_items));
        } else {
          const data = await fetchMonthly(yearNum, monthNum);
          setDashItems(data.items);
          setDashPeriodN1List([data.period_n1]);
          setDashPrevItems(data.prev_items);
        }
      } catch (error: unknown) {
        const e = error as MessageError;
        setDashErr(e?.message ?? "Erreur chargement dashboard");
      } finally {
        setDashLoading(false);
      }
    })();
  }, [dashScope, dashYear, dashMonth, dashRestaurant, dashRefreshTick]);

  async function refreshDailyStatus() {
    if (!canImportData) return;
    if (!restaurants) return;
    const actionableRestaurants = restaurants.filter((restaurant) => restaurant.can_import);
    const today = toIsoDate(new Date());
    if (actionableRestaurants.length === 0) {
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
      const missing = actionableRestaurants.filter((r) => !reported.has(r.code));
      setDailyStatus({ loading: false, missing, date: today, error: null, noRestaurants: false });
    } catch (error: unknown) {
      const e = error as MessageError;
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
  const weekOptions = useMemo(() => {
    const yearNum = Number(dashYear);
    if (!yearNum) return [];
    const weeks = isoWeeksInYear(yearNum);
    return Array.from({ length: weeks }, (_, idx) => String(idx + 1).padStart(2, "0"));
  }, [dashYear]);
  const selectedWeekRange = useMemo(() => {
    const yearNum = Number(dashYear);
    const weekNum = Number(dashWeek);
    if (!yearNum || !weekNum) return null;
    const weekStart = getIsoWeekStart(yearNum, weekNum);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const startIso = weekStart.toISOString().slice(0, 10);
    const endIso = weekEnd.toISOString().slice(0, 10);
    return { startIso, endIso };
  }, [dashWeek, dashYear]);
  const periodLabel = useMemo(() => {
    if (dashScope === "year") return `année ${dashYear}`;
    if (dashScope === "week") {
      if (!selectedWeekRange) return `semaine ${dashWeek} ${dashYear}`;
      return `semaine ${dashWeek} • ${formatIsoDayMonthYear(selectedWeekRange.startIso)} - ${formatIsoDayMonthYear(selectedWeekRange.endIso)}`;
    }
    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      const start = String(Math.min(from || 1, to || 1)).padStart(2, "0");
      const end = String(Math.max(from || 1, to || 1)).padStart(2, "0");
      return `${start}/${dashMonth}/${dashYear} - ${end}/${dashMonth}/${dashYear}`;
    }
    return `${monthLabel} ${dashYear}`;
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashWeek, dashYear, monthLabel, selectedWeekRange]);
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
    if (dashScope === "week") {
      if (!selectedWeekRange) {
        return `Voici les données de ${restaurantLabel} sur la semaine ${dashWeek} de ${dashYear}.`;
      }
      return `Voici les données de ${restaurantLabel} du ${formatIsoDayMonthYear(selectedWeekRange.startIso)} au ${formatIsoDayMonthYear(selectedWeekRange.endIso)}.`;
    }

    const from = Number(dashDayFrom);
    const to = Number(dashDayTo);
    const start = String(Math.min(from || 1, to || 1)).padStart(2, "0");
    const end = String(Math.max(from || 1, to || 1)).padStart(2, "0");
    if (start === end) {
      return `Voici les données de ${restaurantLabel} pour le ${start}/${dashMonth}/${dashYear}.`;
    }
    return `Voici les données de ${restaurantLabel} du ${start}/${dashMonth}/${dashYear} au ${end}/${dashMonth}/${dashYear}.`;
  }, [dashDayFrom, dashDayTo, dashMonth, dashRestaurant, dashScope, dashWeek, dashYear, monthLabel, restaurants, selectedWeekRange]);

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
    return dayOptions.filter((day) => Number(day) > from);
  }, [dashDayFrom, dayOptions]);

  useEffect(() => {
    if (dayOptions.length === 0) return;
    if (!dayOptions.includes(dashDayFrom)) setDashDayFrom(dayOptions[0]);
    if (!dayOptions.includes(dashDayTo)) setDashDayTo(dayOptions[0]);
  }, [dashDayFrom, dashDayTo, dayOptions]);

  useEffect(() => {
    if (weekOptions.length === 0) return;
    if (!weekOptions.includes(dashWeek)) {
      setDashWeek(weekOptions[weekOptions.length - 1]);
    }
  }, [dashWeek, weekOptions]);

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
    if (dashScope === "week") {
      if (!selectedWeekRange) return [];
      return dashItems.filter(
        (item) => item.report_date >= selectedWeekRange.startIso && item.report_date <= selectedWeekRange.endIso
      );
    }
    if (dashScope === "month") {
      const monthPrefix = `${dashYear}-${dashMonth}`;
      return dashItems.filter((item) => item.report_date.startsWith(monthPrefix));
    }
    if (dashScope === "custom") {
      if (!dashCustomFrom || !dashCustomTo) return [];
      const from = dashCustomFrom <= dashCustomTo ? dashCustomFrom : dashCustomTo;
      const to = dashCustomFrom <= dashCustomTo ? dashCustomTo : dashCustomFrom;
      return dashItems.filter((item) => item.report_date >= from && item.report_date <= to);
    }
    const from = Number(dashDayFrom);
    const to = Number(dashDayTo);
    if (!from || !to) return [];
    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const fromIso = `${dashYear}-${dashMonth}-${String(start).padStart(2, "0")}`;
    const toIso = `${dashYear}-${dashMonth}-${String(end).padStart(2, "0")}`;
    return dashItems.filter((item) => item.report_date >= fromIso && item.report_date <= toIso);
  }, [dashCustomFrom, dashCustomTo, dashDayFrom, dashDayTo, dashItems, dashMonth, dashScope, dashYear, selectedWeekRange]);

  const dashTotals = useMemo(() => {
    let ca = 0;
    let clients = 0;
    let caDelivery = 0;
    let caDrive = 0;
    let caCnc = 0;
    let marge = 0;
    let pertesMontant = 0;
    for (const item of scopedDashItems) {
      const kpi = item.kpi;
      ca += kpi?.ca_real ?? item.ca_net_total ?? 0;
      clients += kpi?.clients ?? item.tac_total ?? 0;
      caDelivery += kpi?.ca_delivery ?? 0;
      caDrive += kpi?.ca_drive ?? 0;
      caCnc += kpi?.ca_click_collect ?? 0;
      marge += item.marge ?? 0;
      pertesMontant += item.pertes_montant ?? 0;
    }

    // N-1 selon le scope :
    // - mois/année : totaux N-1 du mois/année entier (period_n1)
    // - semaine : totaux N-1 de la même semaine ISO en N-1 (prev_items filtrés)
    // - jour : comparaison jour par jour (kpi.n1_ht)
    let caN1 = 0;
    let clientsN1 = 0;
    let caDeliveryN1 = 0;
    let caDriveN1 = 0;
    let caCncN1 = 0;
    let margeN1 = 0;
    let pertesMontantN1 = 0;
    if (dashScope === "month" || dashScope === "year") {
      for (const p of dashPeriodN1List) {
        caN1 += p.ca;
        clientsN1 += p.clients;
        caDeliveryN1 += p.ca_delivery;
        caDriveN1 += p.ca_drive ?? 0;
        caCncN1 += p.ca_click_collect;
        margeN1 += p.marge;
        pertesMontantN1 += p.pertes_montant;
      }
    } else if (dashScope === "week" && selectedWeekRange) {
      // Calculer la plage de la même semaine ISO en N-1
      const prevYear = Number(dashYear) - 1;
      const weekNum = Number(dashWeek);
      const prevWeekStart = getIsoWeekStart(prevYear, weekNum);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setUTCDate(prevWeekStart.getUTCDate() + 6);
      const prevStartIso = prevWeekStart.toISOString().slice(0, 10);
      const prevEndIso = prevWeekEnd.toISOString().slice(0, 10);
      for (const p of dashPrevItems) {
        if (!p || !p.report_date) continue;
        if (p.report_date >= prevStartIso && p.report_date <= prevEndIso) {
          caN1 += p.ca;
          clientsN1 += p.clients;
          caDeliveryN1 += p.ca_delivery;
          caDriveN1 += p.ca_drive ?? 0;
          caCncN1 += p.ca_click_collect;
          margeN1 += p.marge;
          pertesMontantN1 += p.pertes_montant;
        }
      }
    } else {
      for (const item of scopedDashItems) {
        const kpi = item.kpi;
        caN1 += kpi?.n1_ht ?? 0;
        clientsN1 += kpi?.clients_n1 ?? 0;
        caDeliveryN1 += kpi?.ca_delivery_n1 ?? 0;
        caDriveN1 += kpi?.ca_drive_n1 ?? 0;
        caCncN1 += kpi?.cnc_n1 ?? 0;
        margeN1 += item.marge_n1 ?? 0;
        pertesMontantN1 += item.pertes_montant_n1 ?? 0;
      }
    }

    const mp = clients ? ca / clients : 0;
    const mpN1 = clientsN1 ? caN1 / clientsN1 : 0;
    const caMagasin = Math.max(0, ca - caDelivery - caDrive - caCnc);
    const caMagasinN1 = Math.max(0, caN1 - caDeliveryN1 - caDriveN1 - caCncN1);
    const tauxPertes = ca ? pertesMontant / ca : 0;
    const tauxPertesN1 = caN1 ? pertesMontantN1 / caN1 : 0;
    return {
      ca,
      caN1,
      clients,
      clientsN1,
      mp,
      mpN1,
      caDelivery,
      caDeliveryN1,
      caDrive,
      caDriveN1,
      caCnc,
      caCncN1,
      caMagasin,
      caMagasinN1,
      marge,
      margeN1,
      pertesMontant,
      pertesMontantN1,
      tauxPertes,
      tauxPertesN1,
    };
  }, [scopedDashItems, dashScope, dashPeriodN1List, dashPrevItems, dashYear, dashWeek, selectedWeekRange]);
  const workforceQuickMetrics = useMemo(() => {
    let heuresPersonnel = 0;
    let heuresPersonnelN1 = 0;
    let heuresTravail = 0;
    let heuresTravailN1 = 0;
    let tauxHoraireWeighted = 0;
    let tauxHoraireWeight = 0;
    let tauxHoraireWeightedN1 = 0;
    let tauxHoraireWeightN1 = 0;
    let osatTotal = 0;
    let osatCount = 0;
    let osatTotalN1 = 0;
    let osatCountN1 = 0;
    let gxiTotal = 0;
    let gxiCount = 0;
    let gxiTotalN1 = 0;
    let gxiCountN1 = 0;
    let googleTotal = 0;
    let googleCount = 0;
    let googleTotalN1 = 0;
    let googleCountN1 = 0;

    for (const item of scopedDashItems) {
      const kpi = item.kpi;
      if (!kpi) continue;
      if (kpi.heures_personnel !== null && kpi.heures_personnel !== undefined) {
        heuresPersonnel += kpi.heures_personnel;
      }
      if (kpi.heures_personnel_n1 !== null && kpi.heures_personnel_n1 !== undefined) {
        heuresPersonnelN1 += kpi.heures_personnel_n1;
      }
      if (kpi.heures_travail !== null && kpi.heures_travail !== undefined) {
        heuresTravail += kpi.heures_travail;
      }
      if (kpi.heures_travail_n1 !== null && kpi.heures_travail_n1 !== undefined) {
        heuresTravailN1 += kpi.heures_travail_n1;
      }
      if (kpi.taux_horaire !== null && kpi.taux_horaire !== undefined) {
        const weight = kpi.heures_travail ?? 1;
        tauxHoraireWeighted += kpi.taux_horaire * weight;
        tauxHoraireWeight += weight;
      }
      if (kpi.taux_horaire_n1 !== null && kpi.taux_horaire_n1 !== undefined) {
        const weightN1 = kpi.heures_travail_n1 ?? 1;
        tauxHoraireWeightedN1 += kpi.taux_horaire_n1 * weightN1;
        tauxHoraireWeightN1 += weightN1;
      }
      if (kpi.osat_score !== null && kpi.osat_score !== undefined) {
        osatTotal += kpi.osat_score;
        osatCount += 1;
      }
      if (kpi.osat_score_n1 !== null && kpi.osat_score_n1 !== undefined) {
        osatTotalN1 += kpi.osat_score_n1;
        osatCountN1 += 1;
      }
      if (kpi.gxi_score !== null && kpi.gxi_score !== undefined) {
        gxiTotal += kpi.gxi_score;
        gxiCount += 1;
      }
      if (kpi.gxi_score_n1 !== null && kpi.gxi_score_n1 !== undefined) {
        gxiTotalN1 += kpi.gxi_score_n1;
        gxiCountN1 += 1;
      }
      if (kpi.google_score !== null && kpi.google_score !== undefined) {
        googleTotal += kpi.google_score;
        googleCount += 1;
      }
      if (kpi.google_score_n1 !== null && kpi.google_score_n1 !== undefined) {
        googleTotalN1 += kpi.google_score_n1;
        googleCountN1 += 1;
      }
    }

    return {
      heuresPersonnel,
      heuresPersonnelN1: heuresPersonnelN1 > 0 ? heuresPersonnelN1 : null,
      heuresTravail,
      heuresTravailN1: heuresTravailN1 > 0 ? heuresTravailN1 : null,
      tauxHoraire: tauxHoraireWeight > 0 ? tauxHoraireWeighted / tauxHoraireWeight : null,
      tauxHoraireN1: tauxHoraireWeightN1 > 0 ? tauxHoraireWeightedN1 / tauxHoraireWeightN1 : null,
      osat: osatCount > 0 ? osatTotal / osatCount : null,
      osatN1: osatCountN1 > 0 ? osatTotalN1 / osatCountN1 : null,
      gxi: gxiCount > 0 ? gxiTotal / gxiCount : null,
      gxiN1: gxiCountN1 > 0 ? gxiTotalN1 / gxiCountN1 : null,
      google: googleCount > 0 ? googleTotal / googleCount : null,
      googleN1: googleCountN1 > 0 ? googleTotalN1 / googleCountN1 : null,
    };
  }, [scopedDashItems]);

  const channelBreakdown = useMemo(() => {
    const rows = [
      { label: "Magasin", value: dashTotals.caMagasin },
      { label: "Drive", value: dashTotals.caDrive },
      { label: "Delivery", value: dashTotals.caDelivery },
      { label: "Click & Collect", value: dashTotals.caCnc },
    ];
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row) => ({
      ...row,
      share: total > 0 ? row.value / total : 0,
    }));
  }, [dashTotals.caCnc, dashTotals.caDelivery, dashTotals.caDrive, dashTotals.caMagasin]);
  const channelBreakdownN1 = useMemo(() => {
    let caN1 = 0;
    let caDeliveryN1 = 0;
    let caDriveN1 = 0;
    let caCncN1 = 0;
    for (const item of scopedDashItems) {
      const kpi = item.kpi;
      caN1 += kpi?.n1_ht ?? 0;
      caDeliveryN1 += kpi?.ca_delivery_n1 ?? 0;
      caDriveN1 += kpi?.ca_drive_n1 ?? 0;
      caCncN1 += kpi?.cnc_n1 ?? 0;
    }
    const caMagasinN1 = Math.max(0, caN1 - caDeliveryN1 - caDriveN1 - caCncN1);
    const rows = [
      { label: "Magasin", value: caMagasinN1 },
      { label: "Drive", value: caDriveN1 },
      { label: "Delivery", value: caDeliveryN1 },
      { label: "Click & Collect", value: caCncN1 },
    ];
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row) => ({
      ...row,
      share: total > 0 ? row.value / total : 0,
    }));
  }, [scopedDashItems]);

  const channelMax = useMemo(
    () => Math.max(...channelBreakdown.map((row) => row.value), 1),
    [channelBreakdown]
  );
  const channelTrend = useMemo(() => {
    const empty = {
      labels: [] as string[],
      commentsN: [] as Array<string | null>,
      commentsN1: [] as Array<string | null>,
      series: [
        { key: "magasin" as const, label: "Magasin", color: "#0f766e", n: [] as number[], n1: [] as number[] },
        { key: "drive" as const, label: "Drive", color: "#8b5cf6", n: [] as number[], n1: [] as number[] },
        { key: "delivery" as const, label: "Delivery", color: "#3b82f6", n: [] as number[], n1: [] as number[] },
        { key: "cnc" as const, label: "Click & Collect", color: "#f59e0b", n: [] as number[], n1: [] as number[] },
      ],
    };

    const byDate = new Map<
      string,
      {
        totalN: number;
        totalN1: number;
        deliveryN: number;
        deliveryN1: number;
        driveN: number;
        driveN1: number;
        cncN: number;
        cncN1: number;
        commentN: string | null;
        commentN1: string | null;
      }
    >();

    for (const item of scopedDashItems) {
      const prev = byDate.get(item.report_date) || {
        totalN: 0,
        totalN1: 0,
        deliveryN: 0,
        deliveryN1: 0,
        driveN: 0,
        driveN1: 0,
        cncN: 0,
        cncN1: 0,
        commentN: null,
        commentN1: null,
      };
      const kpi = item.kpi;
      prev.totalN += kpi?.ca_real ?? item.ca_net_total ?? 0;
      prev.totalN1 += kpi?.n1_ht ?? 0;
      prev.deliveryN += kpi?.ca_delivery ?? 0;
      prev.deliveryN1 += kpi?.ca_delivery_n1 ?? 0;
      prev.driveN += kpi?.ca_drive ?? 0;
      prev.driveN1 += kpi?.ca_drive_n1 ?? 0;
      prev.cncN += kpi?.ca_click_collect ?? 0;
      prev.cncN1 += kpi?.cnc_n1 ?? 0;
      prev.commentN = mergeComment(prev.commentN, item.comment ?? null);
      prev.commentN1 = mergeComment(prev.commentN1, item.comment_n1 ?? null);
      byDate.set(item.report_date, prev);
    }

    const pushBucket = (values: {
      totalN: number;
      totalN1: number;
      deliveryN: number;
      deliveryN1: number;
      driveN: number;
      driveN1: number;
      cncN: number;
      cncN1: number;
      commentN: string | null;
      commentN1: string | null;
    }) => {
      const magasinN = Math.max(0, values.totalN - values.deliveryN - values.driveN - values.cncN);
      const magasinN1 = Math.max(0, values.totalN1 - values.deliveryN1 - values.driveN1 - values.cncN1);
      empty.series[0].n.push(magasinN);
      empty.series[0].n1.push(magasinN1);
      empty.series[1].n.push(values.driveN);
      empty.series[1].n1.push(values.driveN1);
      empty.series[2].n.push(values.deliveryN);
      empty.series[2].n1.push(values.deliveryN1);
      empty.series[3].n.push(values.cncN);
      empty.series[3].n1.push(values.cncN1);
      empty.commentsN.push(values.commentN);
      empty.commentsN1.push(values.commentN1);
    };

    if (dashScope === "year") {
      const yearNum = Number(dashYear);
      if (!yearNum) return empty;
      empty.labels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(yearNum, i, 1))
      );
      const monthBuckets = Array.from({ length: 12 }, () => ({
        totalN: 0,
        totalN1: 0,
        deliveryN: 0,
        deliveryN1: 0,
        driveN: 0,
        driveN1: 0,
        cncN: 0,
        cncN1: 0,
        commentN: null as string | null,
        commentN1: null as string | null,
      }));
      for (const item of scopedDashItems) {
        const monthIdx = Number(item.report_date.slice(5, 7)) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;
        const kpi = item.kpi;
        monthBuckets[monthIdx].totalN += kpi?.ca_real ?? item.ca_net_total ?? 0;
        monthBuckets[monthIdx].totalN1 += kpi?.n1_ht ?? 0;
        monthBuckets[monthIdx].deliveryN += kpi?.ca_delivery ?? 0;
        monthBuckets[monthIdx].deliveryN1 += kpi?.ca_delivery_n1 ?? 0;
        monthBuckets[monthIdx].driveN += kpi?.ca_drive ?? 0;
        monthBuckets[monthIdx].driveN1 += kpi?.ca_drive_n1 ?? 0;
        monthBuckets[monthIdx].cncN += kpi?.ca_click_collect ?? 0;
        monthBuckets[monthIdx].cncN1 += kpi?.cnc_n1 ?? 0;
        monthBuckets[monthIdx].commentN = mergeComment(monthBuckets[monthIdx].commentN, item.comment ?? null);
        monthBuckets[monthIdx].commentN1 = mergeComment(monthBuckets[monthIdx].commentN1, item.comment_n1 ?? null);
      }
      monthBuckets.forEach(pushBucket);
      return empty;
    }

    if (dashScope === "week") {
      if (!selectedWeekRange) return empty;
      const weekStart = new Date(`${selectedWeekRange.startIso}T00:00:00Z`);
      for (let i = 0; i < 7; i += 1) {
        const current = new Date(weekStart);
        current.setUTCDate(weekStart.getUTCDate() + i);
        const iso = current.toISOString().slice(0, 10);
        empty.labels.push(formatIsoDayMonth(iso));
        pushBucket(
          byDate.get(iso) || {
            totalN: 0,
            totalN1: 0,
            deliveryN: 0,
            deliveryN1: 0,
            driveN: 0,
            driveN1: 0,
            cncN: 0,
            cncN1: 0,
            commentN: null,
            commentN1: null,
          }
        );
      }
      return empty;
    }

    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      if (!from || !to) return empty;
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      for (let d = start; d <= end; d += 1) {
        const day = String(d).padStart(2, "0");
        const iso = `${dashYear}-${dashMonth}-${day}`;
        empty.labels.push(day);
        pushBucket(
          byDate.get(iso) || {
            totalN: 0,
            totalN1: 0,
            deliveryN: 0,
            deliveryN1: 0,
            driveN: 0,
            driveN1: 0,
            cncN: 0,
            cncN1: 0,
            commentN: null,
            commentN1: null,
          }
        );
      }
      return empty;
    }

    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return empty;
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    for (let d = 1; d <= lastDay; d += 1) {
      const day = String(d).padStart(2, "0");
      const iso = `${dashYear}-${dashMonth}-${day}`;
      empty.labels.push(day);
      pushBucket(
        byDate.get(iso) || {
          totalN: 0,
          totalN1: 0,
          deliveryN: 0,
          deliveryN1: 0,
          driveN: 0,
          driveN1: 0,
          cncN: 0,
          cncN1: 0,
          commentN: null,
          commentN1: null,
        }
      );
    }
    return empty;
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, scopedDashItems, selectedWeekRange]);

  const dashTrend = useMemo(() => {
    if (dashScope === "year") {
      const labels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Number(dashYear), i, 1))
      );
      const n = Array.from({ length: 12 }, () => 0);
      const n1 = Array.from({ length: 12 }, () => 0);
      const commentsN = Array.from({ length: 12 }, () => null as string | null);
      const commentsN1 = Array.from({ length: 12 }, () => null as string | null);
      for (const item of scopedDashItems) {
        const monthIdx = Number(item.report_date.slice(5, 7)) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;
        n[monthIdx] += item.kpi?.ca_real ?? item.ca_net_total ?? 0;
        n1[monthIdx] += item.kpi?.n1_ht ?? 0;
        commentsN[monthIdx] = mergeComment(commentsN[monthIdx], item.comment ?? null);
        commentsN1[monthIdx] = mergeComment(commentsN1[monthIdx], item.comment_n1 ?? null);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    if (dashScope === "week") {
      if (!selectedWeekRange) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
      const labels: string[] = [];
      const n: number[] = [];
      const n1: number[] = [];
      const commentsN: Array<string | null> = [];
      const commentsN1: Array<string | null> = [];
      const byDate = new Map<string, { n: number; n1: number; commentN: string | null; commentN1: string | null }>();
      for (const item of scopedDashItems) {
        const prev = byDate.get(item.report_date) || { n: 0, n1: 0, commentN: null, commentN1: null };
        prev.n += item.kpi?.ca_real ?? item.ca_net_total ?? 0;
        prev.n1 += item.kpi?.n1_ht ?? 0;
        prev.commentN = mergeComment(prev.commentN, item.comment ?? null);
        prev.commentN1 = mergeComment(prev.commentN1, item.comment_n1 ?? null);
        byDate.set(item.report_date, prev);
      }
      const weekStart = new Date(`${selectedWeekRange.startIso}T00:00:00Z`);
      for (let i = 0; i < 7; i += 1) {
        const current = new Date(weekStart);
        current.setUTCDate(weekStart.getUTCDate() + i);
        const iso = current.toISOString().slice(0, 10);
        const values = byDate.get(iso) || { n: 0, n1: 0, commentN: null, commentN1: null };
        labels.push(formatIsoDayMonth(iso));
        n.push(values.n);
        n1.push(values.n1);
        commentsN.push(values.commentN);
        commentsN1.push(values.commentN1);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      if (!from || !to) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const labels: string[] = [];
      const n: number[] = [];
      const n1: number[] = [];
      const commentsN: Array<string | null> = [];
      const commentsN1: Array<string | null> = [];
      const byDate = new Map<string, { n: number; n1: number; commentN: string | null; commentN1: string | null }>();
      for (const item of scopedDashItems) {
        const prev = byDate.get(item.report_date) || { n: 0, n1: 0, commentN: null, commentN1: null };
        prev.n += item.kpi?.ca_real ?? item.ca_net_total ?? 0;
        prev.n1 += item.kpi?.n1_ht ?? 0;
        prev.commentN = mergeComment(prev.commentN, item.comment ?? null);
        prev.commentN1 = mergeComment(prev.commentN1, item.comment_n1 ?? null);
        byDate.set(item.report_date, prev);
      }
      for (let d = start; d <= end; d += 1) {
        const day = String(d).padStart(2, "0");
        const iso = `${dashYear}-${dashMonth}-${day}`;
        const values = byDate.get(iso) || { n: 0, n1: 0, commentN: null, commentN1: null };
        labels.push(day);
        n.push(values.n);
        n1.push(values.n1);
        commentsN.push(values.commentN);
        commentsN1.push(values.commentN1);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const byDate = new Map<string, MonthlyItem>();
    scopedDashItems.forEach((item) => byDate.set(item.report_date, item));
    const labels: string[] = [];
    const n: number[] = [];
    const n1: number[] = [];
    const commentsN: Array<string | null> = [];
    const commentsN1: Array<string | null> = [];
    for (let d = 1; d <= lastDay; d += 1) {
      const iso = new Date(Date.UTC(yearNum, monthNum - 1, d)).toISOString().slice(0, 10);
      const item = byDate.get(iso);
      const caReal = item?.kpi?.ca_real ?? item?.ca_net_total ?? 0;
      const caN1 = item?.kpi?.n1_ht ?? 0;
      labels.push(String(d));
      n.push(caReal);
      n1.push(caN1);
      commentsN.push(item?.comment ?? null);
      commentsN1.push(item?.comment_n1 ?? null);
    }
    return { labels, n, n1, commentsN, commentsN1 };
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, scopedDashItems, selectedWeekRange]);

  const salesTrend = useMemo(() => {
    if (dashScope === "year") {
      const labels = Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(Number(dashYear), i, 1))
      );
      const n = Array.from({ length: 12 }, () => 0);
      const n1 = Array.from({ length: 12 }, () => 0);
      const commentsN = Array.from({ length: 12 }, () => null as string | null);
      const commentsN1 = Array.from({ length: 12 }, () => null as string | null);
      for (const item of scopedDashItems) {
        const monthIdx = Number(item.report_date.slice(5, 7)) - 1;
        if (monthIdx < 0 || monthIdx > 11) continue;
        n[monthIdx] += item.kpi?.clients ?? item.tac_total ?? 0;
        n1[monthIdx] += item.kpi?.clients_n1 ?? 0;
        commentsN[monthIdx] = mergeComment(commentsN[monthIdx], item.comment ?? null);
        commentsN1[monthIdx] = mergeComment(commentsN1[monthIdx], item.comment_n1 ?? null);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    if (dashScope === "week") {
      if (!selectedWeekRange) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
      const labels: string[] = [];
      const n: number[] = [];
      const n1: number[] = [];
      const commentsN: Array<string | null> = [];
      const commentsN1: Array<string | null> = [];
      const byDate = new Map<string, { n: number; n1: number; commentN: string | null; commentN1: string | null }>();
      for (const item of scopedDashItems) {
        const prev = byDate.get(item.report_date) || { n: 0, n1: 0, commentN: null, commentN1: null };
        prev.n += item.kpi?.clients ?? item.tac_total ?? 0;
        prev.n1 += item.kpi?.clients_n1 ?? 0;
        prev.commentN = mergeComment(prev.commentN, item.comment ?? null);
        prev.commentN1 = mergeComment(prev.commentN1, item.comment_n1 ?? null);
        byDate.set(item.report_date, prev);
      }
      const weekStart = new Date(`${selectedWeekRange.startIso}T00:00:00Z`);
      for (let i = 0; i < 7; i += 1) {
        const current = new Date(weekStart);
        current.setUTCDate(weekStart.getUTCDate() + i);
        const iso = current.toISOString().slice(0, 10);
        const values = byDate.get(iso) || { n: 0, n1: 0, commentN: null, commentN1: null };
        labels.push(formatIsoDayMonth(iso));
        n.push(values.n);
        n1.push(values.n1);
        commentsN.push(values.commentN);
        commentsN1.push(values.commentN1);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    if (dashScope === "day") {
      const from = Number(dashDayFrom);
      const to = Number(dashDayTo);
      if (!from || !to) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      const labels: string[] = [];
      const n: number[] = [];
      const n1: number[] = [];
      const commentsN: Array<string | null> = [];
      const commentsN1: Array<string | null> = [];
      const byDate = new Map<string, { n: number; n1: number; commentN: string | null; commentN1: string | null }>();
      for (const item of scopedDashItems) {
        const prev = byDate.get(item.report_date) || { n: 0, n1: 0, commentN: null, commentN1: null };
        prev.n += item.kpi?.clients ?? item.tac_total ?? 0;
        prev.n1 += item.kpi?.clients_n1 ?? 0;
        prev.commentN = mergeComment(prev.commentN, item.comment ?? null);
        prev.commentN1 = mergeComment(prev.commentN1, item.comment_n1 ?? null);
        byDate.set(item.report_date, prev);
      }
      for (let d = start; d <= end; d += 1) {
        const day = String(d).padStart(2, "0");
        const iso = `${dashYear}-${dashMonth}-${day}`;
        const values = byDate.get(iso) || { n: 0, n1: 0, commentN: null, commentN1: null };
        labels.push(day);
        n.push(values.n);
        n1.push(values.n1);
        commentsN.push(values.commentN);
        commentsN1.push(values.commentN1);
      }
      return { labels, n, n1, commentsN, commentsN1 };
    }

    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return { labels: [], n: [], n1: [], commentsN: [], commentsN1: [] };
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const byDate = new Map<string, MonthlyItem>();
    scopedDashItems.forEach((item) => byDate.set(item.report_date, item));
    const labels: string[] = [];
    const n: number[] = [];
    const n1: number[] = [];
    const commentsN: Array<string | null> = [];
    const commentsN1: Array<string | null> = [];
    for (let d = 1; d <= lastDay; d += 1) {
      const iso = new Date(Date.UTC(yearNum, monthNum - 1, d)).toISOString().slice(0, 10);
      const item = byDate.get(iso);
      const clients = item?.kpi?.clients ?? item?.tac_total ?? 0;
      const clientsN1 = item?.kpi?.clients_n1 ?? 0;
      labels.push(String(d));
      n.push(clients);
      n1.push(clientsN1);
      commentsN.push(item?.comment ?? null);
      commentsN1.push(item?.comment_n1 ?? null);
    }
    return { labels, n, n1, commentsN, commentsN1 };
  }, [dashDayFrom, dashDayTo, dashMonth, dashScope, dashYear, scopedDashItems, selectedWeekRange]);

  const basketTrend = useMemo(() => {
    const len = Math.min(dashTrend.labels.length, salesTrend.labels.length);
    const labels = dashTrend.labels.slice(0, len);
    const commentsN = (dashTrend.commentsN ?? []).slice(0, len);
    const commentsN1 = (dashTrend.commentsN1 ?? []).slice(0, len);
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
    return { labels, n, n1, commentsN, commentsN1 };
  }, [dashTrend, salesTrend]);

  const trendChart = useMemo(() => {
    const padLeft = 2;
    const padRight = 2;
    const padTop = 28;
    const padBottom = 38;
    const chartWidth = 920;
    const chartHeight = 300;
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
    return { label, n, n1, nPoint, n1Point, idx: hoveredTrendIndex };
  }, [dashTrend, hoveredTrendIndex, trendChart]);

  useEffect(() => {
    setHoveredTrendIndex(null);
  }, [dashScope, dashYear, dashMonth, dashWeek, dashDayFrom, dashDayTo, dashRestaurant]);

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
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setCreateUserDialog({
        open: true,
        kind: "error",
        title: "Création impossible",
        description: "Email requis.",
      });
      return;
    }
    if (isAdmin && newRole !== "READONLY" && newRole !== "MANAGER") {
      setCreateUserDialog({
        open: true,
        kind: "error",
        title: "Création impossible",
        description: "Un admin peut uniquement créer des utilisateurs READONLY ou MANAGER.",
      });
      return;
    }
    try {
      const res = await createUser({
        email,
        role: newRole,
        first_name: newFirstName.trim() || null,
        last_name: newLastName.trim() || null,
      });
      const emailFeedback = res.email_sent
        ? "Mail de bienvenue envoyé."
        : `Mail non envoyé${res.email_error ? ` (${res.email_error})` : ""}.`;
      setCreateUserDialog({
        open: true,
        kind: "success",
        title: "Utilisateur créé avec succès",
        description: `Compte: ${res.email} (${res.role})\nMot de passe temporaire actif (changement obligatoire à la première connexion).\n${emailFeedback}`,
      });
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewRole("READONLY");
      await loadDevUsers();
    } catch (error: unknown) {
      const e = error as MessageError;
      const rawMessage = String(e?.message ?? "Erreur création utilisateur");
      const localizedMessage =
        rawMessage === "Email already exists"
          ? "Cet email existe déjà"
          : rawMessage;
      setCreateUserDialog({
        open: true,
        kind: "error",
        title: "Échec de création utilisateur",
        description: localizedMessage,
      });
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
        <StatusDialog
          open={createUserDialog.open}
          kind={createUserDialog.kind}
          title={createUserDialog.title}
          description={createUserDialog.description}
          onClose={() => setCreateUserDialog((prev) => ({ ...prev, open: false }))}
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
            } catch (error: unknown) {
              const e = error as MessageError;
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
              headerControls={
                activeTab === "executive" ? (
                  <Button
                    type="button"
                    onClick={() => setExecutiveExportSignal((prev) => prev + 1)}
                  >
                    Exporter en PDF
                  </Button>
                ) : null
              }
            />

            {activeTab === "overview" ? (
              <OverviewFilters
                dashScope={dashScope}
                dashYear={dashYear}
                dashMonth={dashMonth}
                dashWeek={dashWeek}
                dashDayFrom={dashDayFrom}
                dashDayTo={dashDayTo}
                dashCustomFrom={dashCustomFrom}
                dashCustomTo={dashCustomTo}
                dashRestaurant={dashRestaurant}
                yearOptions={yearOptions}
                weekOptions={weekOptions}
                dayOptions={dayOptions}
                dayToOptions={dayToOptions}
                restaurants={restaurants}
                onDashScopeChange={setDashScope}
                onDashYearChange={setDashYear}
                onDashMonthChange={setDashMonth}
                onDashWeekChange={setDashWeek}
                onDashDayFromChange={setDashDayFrom}
                onDashDayToChange={setDashDayTo}
                onDashCustomFromChange={setDashCustomFrom}
                onDashCustomToChange={setDashCustomTo}
                onDashRestaurantChange={setDashRestaurant}
              />
            ) : null}

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
              dashWeek={dashWeek}
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
              channelBreakdownN1={channelBreakdownN1}
              channelTrend={channelTrend}
              channelMax={channelMax}
              salesTrend={salesTrend}
              basketTrend={basketTrend}
              storeQuickView={storeQuickView}
              workforceQuickMetrics={workforceQuickMetrics}
            />

            <ImportsPage
              visible={canImportData}
              restaurants={restaurants}
              canReplaceImport={canReplaceImport}
              showDebugHead={isDev || isAdmin}
              pendingReimport={pendingReimport}
              onPendingReimportHandled={() => setPendingReimport(null)}
              onUploaded={() => {
                refreshDailyStatus();
                setDashRefreshTick((tick) => tick + 1);
              }}
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
            <DirectionPage
              visible={canViewGlobalBk}
              restaurants={restaurants}
              openExportSignal={executiveExportSignal}
            />

            <BudgetPage visible={canViewGlobalBk} restaurants={restaurants} />

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
              newRole={newRole}
              setNewRole={setNewRole}
              handleCreateUser={handleCreateUser}
              devUsers={devUsers}
              meId={me?.id}
              onAskDeleteUser={(id, email) => {
                if (!canDeleteUsers) return;
                setConfirmDeleteUser({ id, label: `${email} (id=${id})` });
              }}
              pageSize={pageSize}
              assocLoading={assocLoading}
              assocMsg={assocMsg}
              assocUsers={assocUsers}
              assocUsersPageItems={assocUsersPageItems}
              assocUsersPage={assocUsersPage}
              totalAssocPages={totalAssocPages}
              onSetAssocUsersPage={(page) => setAssocUsersPage(Math.max(1, Math.min(totalAssocPages, page)))}
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
