import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RestaurantManager } from "@/components/admin/RestaurantManager";
import { UserRestaurantAssign } from "@/components/admin/UserRestaurantAssign";
import { TabsContent } from "@/components/ui/tabs";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "Vide", color: "bg-muted" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: "Faible", color: "bg-red-500" };
  if (score <= 4) return { score, label: "Moyen", color: "bg-amber-500" };
  return { score, label: "Fort", color: "bg-emerald-500" };
}

type DevUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

type AssocUser = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
  restaurants: Array<{ id: number; code: string; name: string }>;
};

type Props = {
  visible: boolean;
  isDev: boolean;
  isAdmin: boolean;
  displayName: string;
  adminRestaurants: Array<{ id: number; code: string; name: string }>;
  devUsersLoading: boolean;
  newFirstName: string;
  setNewFirstName: (value: string) => void;
  newLastName: string;
  setNewLastName: (value: string) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  newPassword2: string;
  setNewPassword2: (value: string) => void;
  newRole: "ADMIN" | "MANAGER" | "READONLY" | "DEV";
  setNewRole: (value: "ADMIN" | "MANAGER" | "READONLY" | "DEV") => void;
  handleCreateUser: () => void;
  createMsg: string | null;
  devUsers: DevUser[];
  usersPageItems: DevUser[];
  meId?: number;
  onAskDeleteUser: (id: number, email: string) => void;
  pageSize: number;
  devUsersPage: number;
  totalUserPages: number;
  onPrevUsersPage: () => void;
  onNextUsersPage: () => void;
  assocLoading: boolean;
  assocMsg: string | null;
  assocUsers: AssocUser[];
  onRemoveAssoc: (u: AssocUser, code: string) => void;
  onSavedAssign: (userId: number, codes: string[]) => void;
};

export function DevPage({
  visible,
  isDev,
  isAdmin,
  displayName,
  adminRestaurants,
  devUsersLoading,
  newFirstName,
  setNewFirstName,
  newLastName,
  setNewLastName,
  newEmail,
  setNewEmail,
  newPassword,
  setNewPassword,
  newPassword2,
  setNewPassword2,
  newRole,
  setNewRole,
  handleCreateUser,
  createMsg,
  devUsers,
  usersPageItems,
  meId,
  onAskDeleteUser,
  pageSize,
  devUsersPage,
  totalUserPages,
  onPrevUsersPage,
  onNextUsersPage,
  assocLoading,
  assocMsg,
  assocUsers,
  onRemoveAssoc,
  onSavedAssign,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  if (!visible) return null;
  const adminRestaurantNames = adminRestaurants.map((r) => r.name).join(", ");
  const trimmedEmail = newEmail.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const roleAllowed = !isAdmin || newRole === "READONLY" || newRole === "MANAGER";
  const showDevColumns = isDev;
  const canCreateUser =
    Boolean(trimmedEmail) &&
    emailLooksValid &&
    newPassword.length >= 8 &&
    newPassword2.length >= 8 &&
    newPassword === newPassword2 &&
    roleAllowed;
  const strength = getPasswordStrength(newPassword);

  return (
    <TabsContent value="dev" className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        {isAdmin && (
          <Card className="xl:col-span-2 border-blue-200/70 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-base">Périmètre administrateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Bonjour {displayName || "admin"}, vous êtes administrateur de {adminRestaurants.length} restaurant
                {adminRestaurants.length > 1 ? "s" : ""}: {adminRestaurantNames || "aucun"}.
              </p>
              <p>
                Vous pouvez créer et supprimer des utilisateurs <span className="font-medium text-foreground">MANAGER</span> et{" "}
                <span className="font-medium text-foreground">READONLY</span> dans votre périmètre, et gérer leurs associations
                restaurants.
              </p>
              <p>
                Vous ne pouvez pas créer/supprimer des comptes <span className="font-medium text-foreground">ADMIN</span> ou{" "}
                <span className="font-medium text-foreground">DEV</span>, ni gérer des utilisateurs hors de vos restaurants.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Création d'utilisateur ({isDev ? "DEV" : "ADMIN"})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
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
                <div className="text-sm md:text-base text-muted-foreground mb-1">Rôle</div>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "ADMIN" | "MANAGER" | "READONLY" | "DEV")}
                >
                  <option value="READONLY">READONLY</option>
                  <option value="MANAGER">MANAGER</option>
                  {isDev && <option value="ADMIN">ADMIN</option>}
                  {isDev && <option value="DEV">DEV</option>}
                </select>
              </div>
              <div>
                <div className="text-sm md:text-base text-muted-foreground mb-1">Mot de passe</div>
                <div className="relative">
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="space-y-1 mt-2">
                  <div className="h-1.5 w-full rounded bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: `${Math.min(100, (strength.score / 6) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">Niveau: {strength.label}</div>
                </div>
              </div>
              <div>
                <div className="text-sm md:text-base text-muted-foreground mb-1">Confirmer</div>
                <div className="relative">
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm"
                    type={showPasswordConfirm ? "text" : "password"}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    placeholder="Retaper le mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPasswordConfirm ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}
                  >
                    {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateUser} disabled={!canCreateUser}>
                Créer
              </Button>
              {createMsg && <div className="text-sm whitespace-pre-wrap">{createMsg}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liste des utilisateurs existants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devUsersLoading && (
              <div className="text-sm md:text-base text-muted-foreground">Chargement des utilisateurs...</div>
            )}
            <div className="text-sm md:text-base text-muted-foreground">
              {devUsers.length === 0
                ? "Aucun utilisateur chargé."
                : `${devUsers.length} utilisateur(s) chargé(s).`}
            </div>

            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showDevColumns && <TableHead className="w-[80px]">ID</TableHead>}
                    <TableHead className="w-[140px]">Prénom</TableHead>
                    <TableHead className="w-[140px]">Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[120px]">Rôle</TableHead>
                    {showDevColumns && <TableHead className="w-[120px]">Active</TableHead>}
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showDevColumns ? 7 : 5} className="text-sm text-muted-foreground">
                        Aucun utilisateur chargé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersPageItems.map((u) => (
                      <TableRow key={u.id}>
                        {showDevColumns && <TableCell>{u.id}</TableCell>}
                        <TableCell>{u.first_name || "-"}</TableCell>
                        <TableCell>{u.last_name || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        {showDevColumns && <TableCell>{u.is_active ? "yes" : "no"}</TableCell>}
                        <TableCell className="text-right">
                          {isDev || isAdmin ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={u.id === meId || u.role === "DEV" || u.role === "ADMIN"}
                              onClick={() => onAskDeleteUser(u.id, u.email)}
                            >
                              Supprimer
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non autorisé</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {devUsers.length > pageSize && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={devUsersPage <= 1} onClick={onPrevUsersPage}>
                  Prev
                </Button>
                <div className="text-sm md:text-base text-muted-foreground">
                  Page {devUsersPage} / {totalUserPages}
                </div>
                <Button variant="outline" size="sm" disabled={devUsersPage >= totalUserPages} onClick={onNextUsersPage}>
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liste des associations existantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {assocLoading && <div className="text-sm md:text-base text-muted-foreground">Chargement.</div>}
              {assocMsg && <div className="text-sm text-destructive">{assocMsg}</div>}
            </div>
            <div className="text-sm md:text-base text-muted-foreground">
              Cette liste affiche les associations déjà créées entre utilisateurs et restaurants. Si un utilisateur est
              associé à un restaurant, il peut consulter ses données. S'il a le rôle{" "}
              <span className="font-medium text-foreground">MANAGER</span>, il peut aussi importer les données de ce
              restaurant.
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
                                className="transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => onRemoveAssoc(u, r.code)}
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
              Clique sur un restaurant pour retirer cette association. Pour ajouter une association, utilise le bloc
              de création ci-dessous.
            </div>
          </CardContent>
        </Card>

        {isDev && <RestaurantManager />}
        <UserRestaurantAssign users={devUsers} assocUsers={assocUsers} onSaved={onSavedAssign} />
      </div>
    </TabsContent>
  );
}
