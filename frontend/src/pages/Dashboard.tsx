import { useEffect, useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logout, listUsers, createUser, deleteUser } from "@/lib/auth";
import { BkReportUploader } from "@/components/bk/BkReportUploader";
import { BkReportView } from "@/components/bk/BkReportView";
import { apiFetch } from "@/lib/api";
import type { BKReport } from "@/components/bk/types";
import { getMyRestaurants } from "@/lib/restaurants";
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

type Restaurant = { id: number; code: string; name: string };

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

  useEffect(() => {
    if (isDev) {
      loadDevUsers();
    }
  }, [isDev]);

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
      setCreateMsg(`✅ Utilisateur cree: ${res.email} (${res.role})`);
      setNewEmail("");
      setNewPassword("");
      setNewPassword2("");
      setNewRole("READONLY");
      await loadDevUsers();
    } catch (e: any) {
      setCreateMsg(`❌ ${e?.message ?? "Erreur creation utilisateur"}`);
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

      <div className="mx-auto max-w-6xl p-6 space-y-6">
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
            {isDev && <TabsTrigger value="dev">Dev</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Informations utilisateur.
                  </div>
                  <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
                    {JSON.stringify(me, null, 2)}
                  </pre>
                  <Button onClick={loadMe} variant="secondary">
                    Rafraîchir
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Statut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">Rôle: {me?.role ?? "—"}</div>
                  <div className="text-sm">
                    Compte: {me?.is_active ? "Actif" : "Inactif"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ces infos pilotent tes accès aux écrans.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Aide rapide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div>1. Va dans “Mes données”.</div>
                  <div>2. Dépose ton CSV du jour.</div>
                  <div>3. Vérifie le tableau puis valide.</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <BkReportUploader
              restaurants={restaurants}
              onUploaded={(r) => setReport(r)}
            />

            <BkReportView report={report} />
          </TabsContent>
          {isDev && (
          <TabsContent value="dev" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Utilisateurs (DEV)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
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
                    <Button onClick={handleCreateUser}>Creer</Button>
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

            <RestaurantManager />
            <UserRestaurantAssign users={devUsers} />
          </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
