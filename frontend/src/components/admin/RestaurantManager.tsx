import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createRestaurant, listRestaurants, lookupMyRhisRestaurant, type RestaurantDto } from "@/lib/restaurants";

function normalizeLetters(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, " ")
    .trim();
}

function buildRestaurantCode(name: string, existingCodes: string[]) {
  const normalized = normalizeLetters(name);
  const tokens = normalized
    .split(/[\s-]+/)
    .filter(Boolean)
    .filter((token) => token !== "BK");

  const baseToken = tokens[0] || "RESTAURANT";
  const existingSet = new Set(existingCodes.map((code) => code.toUpperCase()));

  // Start with BK- + first 3 significant letters, then extend if the code already exists.
  for (let length = 3; length <= baseToken.length; length += 1) {
    const candidate = `BK-${baseToken.slice(0, length)}`;
    if (!existingSet.has(candidate)) return candidate;
  }

  let suffix = 2;
  const fullCandidate = `BK-${baseToken}`;
  while (existingSet.has(`${fullCandidate}${suffix}`)) {
    suffix += 1;
  }
  return `${fullCandidate}${suffix}`;
}

export function RestaurantManager() {
  const [myrhisId, setMyrhisId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantDto[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(restaurants.length / pageSize));
  const pageItems = restaurants.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  const hasValidMyrhisId = /^\d{6}$/.test(myrhisId.trim());

  async function loadRestaurants() {
    try {
      const data = await listRestaurants();
      setRestaurants(data);
      setPage(1);
    } catch (error: unknown) {
      const e = error as { message?: string };
      setMsg(`Erreur: ${e?.message ?? "Erreur"}`);
    }
  }

  useEffect(() => {
    void listRestaurants()
      .then((data) => {
        setRestaurants(data);
        setPage(1);
      })
      .catch((error: unknown) => {
        const e = error as { message?: string };
        setMsg(`Erreur: ${e?.message ?? "Erreur"}`);
      });
  }, []);

  async function create() {
    setMsg(null);
    setLookupMessage(null);
    const externalId = myrhisId.trim();
    if (!externalId) {
      setMsg("ID MyRHIS requis.");
      return;
    }
    if (!/^\d{6}$/.test(externalId)) {
      setMsg("ID MyRHIS invalide. Format attendu: 6 chiffres.");
      return;
    }
    const parsedExternalId = Number(externalId);

    try {
      setCreateLoading(true);

      // Dev note:
      // We always derive the local restaurant label from MyRHIS at creation time,
      // then generate a readable local code with the pattern BK-XXX.
      // If that code already exists, we extend it and finally suffix it if needed.
      const restaurant = await lookupMyRhisRestaurant(parsedExternalId);
      const nextName = restaurant.name.trim();
      const nextCode = buildRestaurantCode(
        nextName,
        restaurants.map((item) => item.code)
      );

      setName(nextName);
      setCode(nextCode);
      setLookupMessage(`Restaurant trouve: ${nextName}`);

      await createRestaurant({ myrhis_id: parsedExternalId, code: nextCode, name: nextName });
      setMsg("Restaurant cree.");
      setMyrhisId("");
      setCode("");
      setName("");
      await loadRestaurants();
    } catch (error: unknown) {
      const e = error as { message?: string };
      setMsg(`Erreur: ${e?.message ?? "Erreur"}`);
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Restaurants (DEV)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {restaurants.length === 0 && (
          <div className="text-xs text-muted-foreground">Aucun restaurant pour l'instant.</div>
        )}
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">ID MyRHIS</div>
            <Input
              value={myrhisId}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                setMyrhisId(digitsOnly);
                setName("");
                setCode("");
                setLookupMessage(null);
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="6 chiffres"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Code genere</div>
            <Input value={code} readOnly placeholder="" />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Libelle MyRHIS</div>
            <Input value={name} readOnly placeholder="" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={create} disabled={createLoading || !hasValidMyrhisId}>
              {createLoading ? "Creation..." : "Creer"}
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Le libellé est repris automatiquement depuis MyRHIS à partir de l'ID saisi. Le code restaurant est ensuite généré pour l'app à partir de ce libellé, avec le format <span className="font-mono">BK-XXX</span>, puis allongé si un code identique existe déjà.
        </div>

        {lookupMessage && <div className="text-xs text-muted-foreground">{lookupMessage}</div>}

        {msg && <div className="text-sm whitespace-pre-wrap">{msg}</div>}

        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID MyRHIS</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Libelle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    Aucun restaurant enregistre.
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((restaurant) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-mono text-xs">{restaurant.myrhis_id ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{restaurant.code}</TableCell>
                    <TableCell>{restaurant.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
      </CardContent>
    </Card>
  );
}
