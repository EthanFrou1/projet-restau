import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssocUser } from "@/components/admin/types";

type Props = {
  assocLoading: boolean;
  assocMsg: string | null;
  assocUsers: AssocUser[];
  assocUsersPageItems: AssocUser[];
  assocUsersPage: number;
  pageSize: number;
  totalAssocPages: number;
  onSetAssocUsersPage: (page: number) => void;
  onRemoveAssoc: (user: AssocUser, code: string) => void;
};

export function UserAssociationsCard({
  assocLoading,
  assocMsg,
  assocUsers,
  assocUsersPageItems,
  assocUsersPage,
  pageSize,
  totalAssocPages,
  onSetAssocUsersPage,
  onRemoveAssoc,
}: Props) {
  const assocPages = Array.from({ length: totalAssocPages }, (_, index) => index + 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Liste des associations existantes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {assocLoading && <div className="text-sm text-muted-foreground md:text-base">Chargement.</div>}
          {assocMsg && <div className="text-sm text-destructive">{assocMsg}</div>}
        </div>
        <div className="text-sm text-muted-foreground md:text-base">
          Cette liste affiche les associations deja creees entre utilisateurs et restaurants. Si un utilisateur est associe
          a un restaurant, il peut consulter ses donnees. S'il a le role{" "}
          <span className="font-medium text-foreground">MANAGER</span>, il peut aussi importer les donnees de ce restaurant.
        </div>

        <div className="overflow-hidden rounded-md border">
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
                assocUsersPageItems.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : user.email}
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {user.restaurants.length === 0 ? (
                          <span className="text-sm text-muted-foreground md:text-base">Aucun</span>
                        ) : (
                          user.restaurants.map((restaurant) => (
                            <Button
                              key={`${user.id}-${restaurant.code}`}
                              size="sm"
                              variant="outline"
                              className="transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => onRemoveAssoc(user, restaurant.code)}
                            >
                              {restaurant.code}
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

        <div className="text-sm text-muted-foreground md:text-base">
          Clique sur un restaurant pour retirer cette association. Pour ajouter une association, utilise le bloc de
          creation ci-dessous.
        </div>
      </CardContent>
    </Card>
  );
}
