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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DevUser } from "@/components/admin/types";

type Props = {
  isDev: boolean;
  isAdmin: boolean;
  meId?: number;
  users: DevUser[];
  loading: boolean;
  onAskDeleteUser: (id: number, email: string) => void;
};

export function UserListCard({ isDev, isAdmin, meId, users, loading, onAskDeleteUser }: Props) {
  const showDevColumns = isDev;
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
              id: "id",
              header: "ID",
              accessorFn: (row) => row.id,
              cell: (info) => info.getValue<number>(),
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
              id: "is_active",
              header: "Active",
              accessorFn: (row) => row.is_active,
              cell: (info) => (info.getValue<boolean>() ? "yes" : "no"),
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
                disabled={row.original.id === meId || row.original.role === "DEV" || (!isDev && row.original.role === "ADMIN")}
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
    data: users,
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Liste des utilisateurs existants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground md:text-base">Chargement des utilisateurs...</div>}
        <div className="text-sm text-muted-foreground md:text-base">
          {users.length === 0 ? "Aucun utilisateur charge." : `${users.length} utilisateur(s) charge(s).`}
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

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {usersTable.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={header.column.id === "actions" ? "text-right" : ""}>
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className={header.column.getCanSort() ? "inline-flex items-center gap-1 hover:underline" : ""}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: "^",
                            desc: "v",
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
                  <TableCell colSpan={usersTable.getAllLeafColumns().length} className="text-sm text-muted-foreground">
                    Aucun utilisateur charge.
                  </TableCell>
                </TableRow>
              ) : (
                usersTable.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.id === "actions" ? "text-right" : ""}>
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
  );
}
