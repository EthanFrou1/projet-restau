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
  if (!visible) return null;

  return (
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
                  onChange={(e) => setNewRole(e.target.value as "ADMIN" | "MANAGER" | "READONLY" | "DEV")}
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
                            disabled={u.id === meId || u.role === "DEV"}
                            onClick={() => onAskDeleteUser(u.id, u.email)}
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
            <CardTitle className="text-base">Associations utilisateurs ? restaurants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {assocLoading && <div className="text-sm md:text-base text-muted-foreground">Chargement.</div>}
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
              Clique sur un restaurant pour le retirer. Pour ajouter, utilise le bloc ci-dessous.
            </div>
          </CardContent>
        </Card>

        <RestaurantManager />
        <UserRestaurantAssign users={devUsers} onSaved={onSavedAssign} />
      </div>
    </TabsContent>
  );
}
