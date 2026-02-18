import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RestaurantRef } from "@/components/admin/types";

type Props = {
  isAdmin: boolean;
  displayName: string;
  adminRestaurants: RestaurantRef[];
};

export function AdminScopeCard({ isAdmin, displayName, adminRestaurants }: Props) {
  if (!isAdmin) return null;

  const adminRestaurantNames = adminRestaurants.map((r) => r.name).join(", ");

  return (
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
  );
}
