import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
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
  newRole: "ADMIN" | "MANAGER" | "READONLY" | "DEV";
  setNewRole: (value: "ADMIN" | "MANAGER" | "READONLY" | "DEV") => void;
  handleCreateUser: () => void;
  devUsers: DevUser[];
  meId?: number;
  onAskDeleteUser: (id: number, email: string) => void;
  pageSize: number;
  assocLoading: boolean;
  assocMsg: string | null;
  assocUsers: AssocUser[];
  assocUsersPageItems: AssocUser[];
  assocUsersPage: number;
  totalAssocPages: number;
  onSetAssocUsersPage: (page: number) => void;
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
  newRole,
  setNewRole,
  handleCreateUser,
  devUsers,
  meId,
  onAskDeleteUser,
  pageSize,
  assocLoading,
  assocMsg,
  assocUsers,
  assocUsersPageItems,
  assocUsersPage,
  totalAssocPages,
  onSetAssocUsersPage,
  onRemoveAssoc,
  onSavedAssign,
}: Props) {
  if (!visible) return null;
  const adminRestaurantNames = adminRestaurants.map((r) => r.name).join(", ");
  const trimmedEmail = newEmail.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const roleAllowed = !isAdmin || newRole === "READONLY" || newRole === "MANAGER";
  const showDevColumns = isDev;
  const canCreateUser = Boolean(trimmedEmail) && emailLooksValid && roleAllowed;
  const assocPages = Array.from({ length: totalAssocPages }, (_, index) => index + 1);
  const [userSorting, setUserSorting] = useState<SortingState>([]);
  const [userGlobalFilter, setUserGlobalFilter] = useState("");
  const [userPagination, setUserPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const userColumns = useMemo<ColumnDef<DevUser>[]>(
    () => [
      ...(showDevColumns
        ? [
            {
              accessorKey: "id",
              header: "ID",
              cell: (info: any) => info.getValue(),
            } as ColumnDef<DevUser>,
          ]
        : []),
      {
        accessorKey: "first_name",
        header: "Prenom",
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "last_name",
        header: "Nom",
        cell: (info) => info.getValue<string | null>() || "-",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => <span className="font-mono text-xs">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: "role",
        header: "Role",
      },
      ...(showDevColumns
        ? [
            {
              accessorKey: "is_active",
              header: "Active",
              cell: (info: any) => (info.getValue() ? "yes" : "no"),
            } as ColumnDef<DevUser>,
          ]
        : []),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="text-right">
            {isDev || isAdmin ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={row.original.id === meId || row.original.role === "DEV" || row.original.role === "ADMIN"}
                onClick={() => onAskDeleteUser(row.original.id, row.original.email)}
              >
                Supprimer
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Non autorise</span>
            )}
          </div>
        ),
      },
    ],
    [showDevColumns, isDev, isAdmin, meId, onAskDeleteUser]
  );

  const usersTable = useReactTable({
    data: devUsers,
    columns: userColumns,
    state: {
      sorting: userSorting,
      globalFilter: userGlobalFilter,
      pagination: userPagination,
    },
    onSortingChange: setUserSorting,
    onGlobalFilterChange: setUserGlobalFilter,
    onPaginationChange: setUserPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  const userPages = Array.from({ length: Math.max(1, usersTable.getPageCount()) }, (_, index) => index + 1);

  return (
    <TabsContent value="dev" className="space-y-4">
      <div className="space-y-4">
        {isAdmin && (
          <Card className="border-blue-200/70 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-base">Perimetre administrateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Bonjour {displayName || "admin"}, vous etes administrateur de {adminRestaurants.length} restaurant
                {adminRestaurants.length > 1 ? "s" : ""}: {adminRestaurantNames || "aucun"}.
              </p>
              <p>
                Vous pouvez creer et supprimer des utilisateurs <span className="font-medium text-foreground">MANAGER</span> et{" "}
                <span className="font-medium text-foreground">READONLY</span> dans votre perimetre, et gerer leurs associations
                restaurants.
              </p>
              <p>
                Vous ne pouvez pas creer/supprimer des comptes <span className="font-medium text-foreground">ADMIN</span> ou{" "}
                <span className="font-medium text-foreground">DEV</span>, ni gerer des utilisateurs hors de vos restaurants.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-[35%_65%]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creation d'utilisateur ({isDev ? "DEV" : "ADMIN"})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-sm md:text-base text-muted-foreground mb-1">Prenom</div>
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
                  <div className="text-sm md:text-base text-muted-foreground mb-1">Role</div>
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
              </div>
              <div className="text-xs text-muted-foreground">
                Le mot de passe temporaire est genere automatiquement et envoye par email.
                L'utilisateur devra le changer a sa premiere connexion.
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleCreateUser} disabled={!canCreateUser}>
                  Creer
                </Button>
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
                  ? "Aucun utilisateur charge."
                  : `${devUsers.length} utilisateur(s) charge(s).`}
              </div>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Rechercher un utilisateur..."
                value={userGlobalFilter}
                onChange={(e) => {
                  setUserGlobalFilter(e.target.value);
                  usersTable.setPageIndex(0);
                }}
              />

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    {usersTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className={header.column.id === "actions" ? "text-right" : ""}
                          >
                            {header.isPlaceholder ? null : (
                              <button
                                type="button"
                                className={
                                  header.column.getCanSort()
                                    ? "inline-flex items-center gap-1 hover:underline"
                                    : ""
                                }
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {{
                                  asc: "↑",
                                  desc: "↓",
                                }[header.column.getIsSorted() as string] ?? null}
                              </button>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {usersTable.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={usersTable.getAllLeafColumns().length}
                          className="text-sm text-muted-foreground"
                        >
                          Aucun utilisateur charge.
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cell.column.id === "actions" ? "text-right" : ""}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {usersTable.getPageCount() > 1 && (
                <div className="flex items-center gap-1">
                  {userPages.map((page) => (
                    <Button
                      key={`users-page-${page}`}
                      variant={page === usersTable.getState().pagination.pageIndex + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => usersTable.setPageIndex(page - 1)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[65%_35%]">
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
                Cette liste affiche les associations deja creees entre utilisateurs et restaurants. Si un utilisateur est
                associe a un restaurant, il peut consulter ses donnees. S'il a le role{" "}
                <span className="font-medium text-foreground">MANAGER</span>, il peut aussi importer les donnees de ce
                restaurant.
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Restaurants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assocUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          Aucune association trouvee.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assocUsersPageItems.map((u) => (
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

              {assocUsers.length > pageSize && (
                <div className="flex items-center gap-1">
                  {assocPages.map((page) => (
                    <Button
                      key={`assoc-page-${page}`}
                      variant={page === assocUsersPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSetAssocUsersPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
              )}

              <div className="text-sm md:text-base text-muted-foreground">
                Clique sur un restaurant pour retirer cette association. Pour ajouter une association, utilise le bloc
                de creation ci-dessous.
              </div>
            </CardContent>
          </Card>

          {isDev && <RestaurantManager />}
          <UserRestaurantAssign users={devUsers} assocUsers={assocUsers} onSaved={onSavedAssign} />
        </div>
      </div>
    </TabsContent>
  );
}
