import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRestaurants, listUsersWithRestaurants, setUserRestaurants } from "@/lib/restaurants";

type UserRow = { id: number; email: string; role: string; is_active: boolean };
type Restaurant = { id: number; code: string; name: string };

type Props = {
  users: UserRow[];
  onSaved?: (userId: number, restaurantCodes: string[]) => void;
};

export function UserRestaurantAssign({ users, onSaved }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [userRestaurants, setUserRestaurantsMap] = useState<
    Record<number, string[]>
  >({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(restaurants.length / pageSize));
  const pageItems = restaurants.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  async function loadRestaurants() {
    try {
      const data = await listRestaurants();
      setRestaurants(data);
      setPage(1);
    }catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Erreur"}`);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      try {
        const data = await listUsersWithRestaurants();
        const map: Record<number, string[]> = {};
        data.forEach((u) => {
          map[u.id] = u.restaurants.map((r) => r.code);
        });
        setUserRestaurantsMap(map);
      } catch (e: any) {
        setMsg(`❌ ${e?.message ?? "Erreur"}`);
      } finally {
        setLoadingUsers(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedCodes([]);
      return;
    }
    setSelectedCodes(userRestaurants[selectedUserId] || []);
  }, [selectedUserId, userRestaurants]);

  async function save() {
    setMsg(null);
    if (!selectedUserId) {
      setMsg("❌ Selectionne un utilisateur.");
      return;
    }
    if (selectedCodes.length === 0) {
      setMsg("❌ Indique au moins un code restaurant.");
      return;
    }
    try {
      await setUserRestaurants(Number(selectedUserId), selectedCodes);
      setUserRestaurantsMap((prev) => ({
        ...prev,
        [Number(selectedUserId)]: selectedCodes,
      }));
      onSaved?.(Number(selectedUserId), selectedCodes);
      setMsg("✅ Associations mises a jour.");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Erreur"}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Associer users → restaurants (DEV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Utilisateur</div>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
            disabled={loadingUsers}
          >
            <option value="">Selectionner...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Restaurants</div>
          {restaurants.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucun restaurant pour l'instant.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pageItems.map((r) => {
                const active = selectedCodes.includes(r.code);
                return (
                  <Button
                    key={r.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => {
                      setSelectedCodes((prev) =>
                        prev.includes(r.code) ? prev : [...prev, r.code]
                      );
                    }}
                  >
                    {r.code}
                  </Button>
                );
              })}
            </div>
          )}

          {selectedCodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCodes.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {restaurants.length > pageSize && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <div className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={save}>Enregistrer</Button>
          <div className="text-xs text-muted-foreground">
            Les restaurants existants sont pré-sélectionnés.
          </div>
        </div>
        {msg && <div className="text-sm whitespace-pre-wrap">{msg}</div>}
      </CardContent>
    </Card>
  );
}
