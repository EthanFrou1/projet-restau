import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TopBar } from "@/components/TopBar";
import { createUser } from "@/lib/auth";
import { logout, listUsers, deleteUser } from "@/lib/auth";
import { UserRestaurantAssign } from "@/components/admin/UserRestaurantAssign";
import { RestaurantManager } from "@/components/admin/RestaurantManager";
import { listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Me = { id: number; email: string; role: string; is_active: boolean };
type AdminPing = { ok: boolean; scope: string };
type AuditRow = { id: number; action: string; actor_email: string; target: string; timestamp: string };

export default function DevPanel({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [adminPing, setAdminPing] = useState<AdminPing | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER" | "READONLY" | "DEV">("READONLY");
  const [createResult, setCreateResult] = useState<string | null>(null);
  const [newPassword2, setNewPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [users, setUsers] = useState<Array<{id:number; email:string; role:string; is_active:boolean}>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
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

  // filtres audit
  const [qAction, setQAction] = useState("");
  const [qActor, setQActor] = useState("");

  const canAdmin = me?.role === "ADMIN" || me?.role === "DEV";
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const passwordOk = newPassword.trim().length >= 8;
  const passwordsMatch = newPassword === newPassword2;
  const canCreate = emailOk && passwordOk && passwordsMatch;


  async function loadMe() {
    setErr(null);
    const data = await apiFetch<Me>("/auth/me");
    setMe(data);
  }

  async function pingAdmin() {
    setErr(null);
    const data = await apiFetch<AdminPing>("/admin/ping");
    setAdminPing(data);
  }

  async function loadAudit() {
    setErr(null);
    const params = new URLSearchParams();
    params.set("limit", "50");
    if (qAction.trim()) params.set("action", qAction.trim());
    if (qActor.trim()) params.set("actor_email", qActor.trim());

    const data = await apiFetch<AuditRow[]>(`/audit/latest?${params.toString()}`);
    setAudit(data);
  }

    async function loadUsers() {
        setUsersLoading(true);
        try {
            const data = await listUsers();
            setUsers(data);
        } finally {
            setUsersLoading(false);
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
    (async () => {
      setLoading(true);
      try {
        await loadMe();
      } catch (e: any) {
        setErr(e?.message ?? "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (me?.role === "DEV") {
      loadUserRestaurants();
    }
  }, [me?.role]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadAudit();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qAction, qActor]);

  const roleBadge = useMemo(() => {
    if (!me) return null;
    return <Badge variant="secondary">{me.role}</Badge>;
  }, [me]);

  return (
    <div className="min-h-screen bg-background text-foreground">
        <TopBar
            email={me?.email ?? ""}
            role={me?.role ?? "—"}
            onLogout={async () => {
                try {
                await logout(); // appelle POST /auth/logout + clear localStorage token
                } finally {
                onLoggedOut(); // repasse sur Login
                }
            }}
        />
        <div className="mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
            <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight">Projet Restau — Dev Panel</h1>
                <p className="text-sm text-muted-foreground">
                Dashboard technique (auth, admin, audit). Simple, sobre, lisible.
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
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                    <CardTitle className="text-base">/auth/me</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    <Button onClick={loadMe} variant="secondary">Refresh</Button>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
                        {JSON.stringify(me, null, 2)}
                    </pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                    <CardTitle className="text-base">/admin/ping</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    <Button onClick={pingAdmin} disabled={!canAdmin}>
                        Ping
                    </Button>
                    {!canAdmin && (
                        <div className="text-xs text-muted-foreground">
                        Visible seulement ADMIN/DEV.
                        </div>
                    )}
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
                        {JSON.stringify(adminPing, null, 2)}
                    </pre>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                    <CardTitle className="text-base">Audit quick</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                    <Button onClick={loadAudit} variant="outline">Load latest</Button>
                    <div className="text-xs text-muted-foreground">
                        Dernières actions (login, refresh, lecture audit, etc.)
                    </div>
                    </CardContent>
                </Card>
                </div>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
                {me?.role === "DEV" && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Créer un utilisateur</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Email</div>
                                    <Input
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="user@restau.com"
                                    />
                                </div>

                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Mot de passe</div>
                                    <div className="flex gap-2">
                                        <Input
                                        type={showPw ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="8 caractères minimum"
                                        />
                                        <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowPw((v) => !v)}
                                        >
                                        {showPw ? "Masquer" : "Voir"}
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Confirmer le mot de passe</div>
                                    <Input
                                        type={showPw ? "text" : "password"}
                                        value={newPassword2}
                                        onChange={(e) => setNewPassword2(e.target.value)}
                                        placeholder="Retaper le mot de passe"
                                    />
                                    {!passwordsMatch && newPassword2.length > 0 && (
                                        <div className="text-xs text-destructive mt-1">
                                        Les mots de passe ne correspondent pas.
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Rôle</div>
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
                            </div>

                            <Button
                                disabled={!canCreate}
                                onClick={async () => {
                                    setCreateResult(null);

                                    if (!emailOk) {
                                    setCreateResult("❌ Email invalide.");
                                    return;
                                    }
                                    if (!passwordOk) {
                                    setCreateResult("❌ Mot de passe trop court (min 8 caractères).");
                                    return;
                                    }

                                    try {
                                        const res = await createUser({
                                            email: newEmail.trim().toLowerCase(),
                                            password: newPassword,
                                            role: newRole,
                                        });
                                        setCreateResult(`✅ Utilisateur créé: ${res.email} (${res.role})`);
                                        setNewEmail("");
                                        setNewPassword("");
                                        setNewPassword2("");
                                        setShowPw(false);
                                        setNewRole("READONLY");
                                    } catch (e: any) {
                                        setCreateResult(`❌ ${e?.message ?? "Erreur création utilisateur"}`);
                                    }
                                }}
                                >
                                Créer l’utilisateur
                            </Button>

                            {createResult && (
                                <div className="text-sm whitespace-pre-wrap">{createResult}</div>
                            )}

                            <div className="text-xs text-muted-foreground">
                                Visible uniquement pour le rôle <b>DEV</b>.  
                                Action auditée automatiquement côté backend.
                            </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                            <CardTitle className="text-base">Utilisateurs (DEV)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={loadUsers} disabled={usersLoading}>
                                {usersLoading ? "Chargement…" : "Charger la liste"}
                                </Button>
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
                                    {users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                        Aucun user chargé.
                                        </TableCell>
                                    </TableRow>
                                    ) : (
                                    users.map((u) => (
                                        <TableRow key={u.id}>
                                        <TableCell>{u.id}</TableCell>
                                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                                        <TableCell>{u.role}</TableCell>
                                        <TableCell>{u.is_active ? "yes" : "no"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={u.id === me.id || u.role === "DEV"}
                                            onClick={async () => {
                                                const ok = confirm(`Supprimer ${u.email} (id=${u.id}) ?`);
                                                if (!ok) return;
                                                await deleteUser(u.id);
                                                await loadUsers(); // refresh
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

                            <div className="text-xs text-muted-foreground">
                                DEV only. Impossible de supprimer soi-même ou un user DEV.
                            </div>
                            </CardContent>
                        </Card>
                        <RestaurantManager />

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Associations utilisateurs → restaurants</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" onClick={loadUserRestaurants} disabled={assocLoading}>
                                      {assocLoading ? "Chargement…" : "Rafraîchir"}
                                    </Button>
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
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Aucun
                                                                    </span>
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
                                                                                    await loadUserRestaurants();
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

                        <UserRestaurantAssign users={users} />
                    </div>
                )}

                <Card>
                <CardHeader>
                    <CardTitle>Admin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                    Ici on ajoutera ensuite: création users, reset password, etc.
                    </div>
                    <Button onClick={pingAdmin} disabled={!canAdmin}>
                    Tester /admin/ping
                    </Button>
                    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto">
                    {JSON.stringify(adminPing, null, 2)}
                    </pre>
                </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-4">
                <Card>
                <CardHeader>
                    <CardTitle>Audit logs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Filtre action</div>
                        <Input value={qAction} onChange={(e) => setQAction(e.target.value)} placeholder="ex: auth.login.success" />
                    </div>
                    <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Filtre actor_email</div>
                        <Input value={qActor} onChange={(e) => setQActor(e.target.value)} placeholder="ex: dev@restau.com" />
                    </div>
                    <div className="flex items-end gap-2">
                        <Button
                        variant="secondary"
                        onClick={() => { setQAction(""); setQActor(""); }}
                        >
                        Reset
                        </Button>
                    </div>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[70px]">ID</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Actor</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead className="w-[220px]">Timestamp</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {audit.length === 0 ? (
                            <TableRow>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                                Aucun log (ou pas encore chargé).
                            </TableCell>
                            </TableRow>
                        ) : (
                            audit.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell>{r.id}</TableCell>
                                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                                <TableCell className="font-mono text-xs">{r.actor_email}</TableCell>
                                <TableCell className="font-mono text-xs">{r.target}</TableCell>
                                <TableCell className="font-mono text-xs">{r.timestamp}</TableCell>
                            </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
                </Card>
            </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
