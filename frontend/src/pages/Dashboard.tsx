import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logout, listUsers, createUser, deleteUser } from "@/lib/auth";
import { BkReportUploader } from "@/components/bk/BkReportUploader";
import { BkReportView } from "@/components/bk/BkReportView";
import { BkReportBrowser } from "@/components/bk/BkReportBrowser";
import { BkMonthlyRecap } from "@/components/bk/BkMonthlyRecap";
import { apiFetch } from "@/lib/api";
import type { BKReport } from "@/components/bk/types";
import { getMyRestaurants, listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";
import { RestaurantManager } from "@/components/admin/RestaurantManager";
import { UserRestaurantAssign } from "@/components/admin/UserRestaurantAssign";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Me = { id: number; email: string; role: string; is_active: boolean };
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

export default function DashboardPage({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<BKReport | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [devUsers, setDevUsers] = useState<Array<{id:number; email:string; role:string; is_active:boolean}>>([]);
  const [devUsersLoading, setDevUsersLoading] = useState(false);
  const [devUsersPage, setDevUsersPage] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "READONLY" | "DEV">("READONLY");
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [assocUsers, setAssocUsers] = useState<
    Array<{
      id: number;
      email: string;
      role: string;
      is_active: boolean;
      restaurants: Array<{ id: number; code: string; name: string }>;
    }>
  >([]);
  const [assocLoading, setAssocLoading] = useState(false);
  const [assocMsg, setAssocMsg] = useState<string | null>(null);
  const [dashYear, setDashYear] = useState(String(new Date().getFullYear()));
  const [dashMonth, setDashMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [dashRestaurant, setDashRestaurant] = useState("");
  const [dashItems, setDashItems] = useState<MonthlyItem[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashErr, setDashErr] = useState<string | null>(null);

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

  const isDev = me?.role === "DEV";
  const canViewGlobalBk =
    me?.role === "MANAGER" || me?.role === "ADMIN" || me?.role === "DEV" || me?.role === "READONLY";
  const canDeleteBk = me?.role === "ADMIN" || me?.role === "DEV";
  const pageSize = 10;
  const totalUserPages = Math.max(1, Math.ceil(devUsers.length / pageSize));
  const usersPageStart = (devUsersPage - 1) * pageSize;
  const usersPageItems = devUsers.slice(usersPageStart, usersPageStart + pageSize);

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
    if (!yearNum || !monthNum) return;
    const restaurantCode = dashRestaurant.trim().toUpperCase();

    (async () => {
      setDashLoading(true);
      setDashErr(null);
      try {
        const params = new URLSearchParams();
        params.set("year", String(yearNum));
        params.set("month", String(monthNum));
        if (restaurantCode) params.set("restaurant_code", restaurantCode);
        const data = await apiFetch<MonthlyItem[]>(
          `/reports/bk/monthly?${params.toString()}`
        );
        setDashItems(data);
      } catch (e: any) {
        setDashErr(e?.message ?? "Erreur chargement dashboard");
      } finally {
        setDashLoading(false);
      }
    })();
  }, [dashYear, dashMonth, dashRestaurant]);

  const monthLabel = useMemo(() => {
    const monthIdx = Number(dashMonth) - 1;
    if (monthIdx < 0 || monthIdx > 11) return "";
    return new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
      new Date(Number(dashYear), monthIdx, 1)
    );
  }, [dashMonth, dashYear]);

  const dashTotals = useMemo(() => {
    let ca = 0;
    let caN1 = 0;
    let clients = 0;
    let clientsN1 = 0;
    let caDelivery = 0;
    let caCnc = 0;
    for (const item of dashItems) {
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
  }, [dashItems]);

  const dashTrend = useMemo(() => {
    const yearNum = Number(dashYear);
    const monthNum = Number(dashMonth);
    if (!yearNum || !monthNum) return { days: [], n: [], n1: [] };
    const lastDay = new Date(yearNum, monthNum, 0).getDate();
    const byDate = new Map<string, MonthlyItem>();
    dashItems.forEach((item) => byDate.set(item.report_date, item));
    const days: number[] = [];
    const n: number[] = [];
    const n1: number[] = [];
    for (let d = 1; d <= lastDay; d += 1) {
      const iso = new Date(Date.UTC(yearNum, monthNum - 1, d)).toISOString().slice(0, 10);
      const item = byDate.get(iso);
      const caReal = item?.kpi?.ca_real ?? item?.ca_net_total ?? 0;
      const caN1 = item?.kpi?.n1_ht ?? 0;
      days.push(d);
      n.push(caReal);
      n1.push(caN1);
    }
    return { days, n, n1 };
  }, [dashItems, dashMonth, dashYear]);

  const storeQuickView = useMemo(() => {
    const map = new Map<string, { code: string; name: string; ca: number; caN1: number; clients: number }>();
    restaurants.forEach((r) =>
      map.set(r.code, { code: r.code, name: r.name, ca: 0, caN1: 0, clients: 0 })
    );
    dashItems.forEach((item) => {
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
  }, [dashItems, restaurants]);

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
      setCreateMsg("❌ Email requis.");
      return;
    }
    if (newPassword.length < 8) {
      setCreateMsg("❌ Mot de passe trop court (min 8).");
      return;
    }
    if (newPassword !== newPassword2) {
      setCreateMsg("❌ Les mots de passe ne correspondent pas.");
      return;
    }
    try {
      const res = await createUser({ email, password: newPassword, role: newRole });
      setCreateMsg(`✅ Utilisateur créé: ${res.email} (${res.role})`);
      setNewEmail("");
      setNewPassword("");
      setNewPassword2("");
      setNewRole("READONLY");
      await loadDevUsers();
    } catch (e: any) {
      setCreateMsg(`❌ ${e?.message ?? "Erreur création utilisateur"}`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        email={me?.email ?? ""}
        role={me?.role ?? "—"}
        onLogout={async () => {
          try {
            await logout();
          } finally {
            onLoggedOut();
          }
        }}
      />

      <div className="mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Bienvenue ! Ici tu retrouves ton accès et tes données quotidiennes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {me ? (
              <div className="text-right">
                <div className="text-sm">{me.email}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 justify-end">
                  {roleBadge}
                  <span>id={me.id}</span>
                  <span>{me.is_active ? "active" : "inactive"}</span>
                </div>
              </div>
            ) : (
              <Badge variant="outline">{loading ? "Loading…" : "Not logged"}</Badge>
            )}
          </div>
        </div>

        {err && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Erreur</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{err}</CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Dashboard</TabsTrigger>
            <TabsTrigger value="data">Mes données</TabsTrigger>
            {canViewGlobalBk && <TabsTrigger value="bk-global">BK global</TabsTrigger>}
            {canViewGlobalBk && <TabsTrigger value="bk-monthly">BK mensuel</TabsTrigger>}
            {isDev && <TabsTrigger value="dev">Dev</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tableau de bord BK</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Année</div>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Mois</div>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Restaurant</div>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
                  <div className="text-sm text-destructive md:col-span-3">{dashErr}</div>
                )}
                {dashLoading && (
                  <div className="text-xs text-muted-foreground md:col-span-3">
                    Chargement du tableau de bord...
                  </div>
                )}
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
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                    <div className="text-2xl font-semibold">{kpi.value}</div>
                    {kpi.change !== null && (
                      <div className="flex items-center gap-1 text-xs">
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
                  <div className="text-xs text-muted-foreground mb-3">
                    {monthLabel} {dashYear}
                  </div>
                  <svg viewBox="0 0 640 240" className="w-full h-56">
                    <rect x="0" y="0" width="640" height="240" fill="transparent" />
                    {(() => {
                      const maxValue = Math.max(
                        ...dashTrend.n,
                        ...dashTrend.n1,
                        1
                      );
                      const padX = 32;
                      const padY = 20;
                      const w = 640 - padX * 2;
                      const h = 240 - padY * 2;
                      const toPoint = (arr: number[]) =>
                        arr
                          .map((v, i) => {
                            const x = padX + (w * i) / Math.max(1, arr.length - 1);
                            const y = padY + h - (v / maxValue) * h;
                            return `${x},${y}`;
                          })
                          .join(" ");
                      const nLine = toPoint(dashTrend.n);
                      const n1Line = toPoint(dashTrend.n1);
                      return (
                        <>
                          <polyline
                            points={n1Line}
                            fill="none"
                            stroke="currentColor"
                            className="text-muted-foreground"
                            strokeDasharray="4 4"
                            strokeWidth="2"
                          />
                          <polyline
                            points={nLine}
                            fill="none"
                            stroke="currentColor"
                            className="text-primary"
                            strokeWidth="3"
                          />
                        </>
                      );
                    })()}
                  </svg>
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
                          <div className="flex items-center justify-between text-xs">
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
                  Vue rapide magasins - {monthLabel} {dashYear}
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
          <TabsContent value="data" className="space-y-4">
            <BkReportUploader
              restaurants={restaurants}
              onUploaded={(r) => setReport(r)}
            />

            <BkReportView report={report} />
          </TabsContent>

          {canViewGlobalBk && (
            <TabsContent value="bk-global" className="space-y-4">
              <BkReportBrowser restaurants={restaurants} canDelete={canDeleteBk} />
            </TabsContent>
          )}

          {canViewGlobalBk && (
            <TabsContent value="bk-monthly" className="space-y-4">
              <BkMonthlyRecap restaurants={restaurants} />
            </TabsContent>
          )}
          {isDev && (
          <TabsContent value="dev" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Utilisateurs (DEV)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-5">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@restau.com"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mot de passe</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 caracteres minimum"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Confirmer</div>
                    <input
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      type="password"
                      value={newPassword2}
                      onChange={(e) => setNewPassword2(e.target.value)}
                      placeholder="Retaper le mot de passe"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Role</div>
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
                <div className="text-xs text-muted-foreground">
                  {devUsers.length === 0
                    ? "Aucun user charge."
                    : `${devUsers.length} utilisateur(s) charge(s).`}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[120px]">Role</TableHead>
                        <TableHead className="w-[120px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">
                            Aucun user charge.
                          </TableCell>
                        </TableRow>
                      ) : (
                        usersPageItems.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>{u.id}</TableCell>
                            <TableCell className="font-mono text-xs">{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell>{u.is_active ? "yes" : "no"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={u.id === me?.id || u.role === "DEV"}
                                onClick={async () => {
                                  const ok = confirm(`Supprimer ${u.email} (id=${u.id}) ?`);
                                  if (!ok) return;
                                  await deleteUser(u.id);
                                  await loadDevUsers();
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
                    <div className="text-xs text-muted-foreground">
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
                <CardTitle className="text-base">Associations utilisateurs → restaurants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {assocLoading && (
                    <div className="text-xs text-muted-foreground">Chargement…</div>
                  )}
                  {assocMsg && <div className="text-sm text-destructive">{assocMsg}</div>}
                </div>

                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
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
                            <TableCell className="font-mono text-xs">{u.email}</TableCell>
                            <TableCell>{u.role}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {u.restaurants.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">Aucun</span>
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
                                      {r.code} ×
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
                <div className="text-xs text-muted-foreground">
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
        </Tabs>
      </div>
    </div>
  );
}







