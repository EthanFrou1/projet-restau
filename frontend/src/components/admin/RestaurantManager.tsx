import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createRestaurant, listRestaurants } from "@/lib/restaurants";

type Restaurant = { id: number; code: string; name: string };

export function RestaurantManager() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
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
  }

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function create() {
    setMsg(null);
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c || !n) {
      setMsg("❌ Code et nom requis.");
      return;
    }
    try {
      await createRestaurant({ code: c, name: n });
      setMsg("✅ Restaurant cree.");
      setCode("");
      setName("");
      await loadRestaurants();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Erreur"}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Restaurants (DEV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {restaurants.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Aucun restaurant pour l'instant.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Code</div>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="TLS-SO" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Nom</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Toulouse Saint Orens" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={create}>Creer</Button>
          </div>
        </div>

        {msg && <div className="text-sm whitespace-pre-wrap">{msg}</div>}

        {restaurants.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Existants: {pageItems.map((r) => `${r.code} (${r.name})`).join(", ")}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
