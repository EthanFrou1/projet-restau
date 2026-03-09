import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { listRestaurants, setUserRestaurants } from "@/lib/restaurants";

type UserRow = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

type Restaurant = { id: number; code: string; name: string };

type AssocUserRow = {
  id: number;
  restaurants: Array<{ id: number; code: string; name: string }>;
};

type Props = {
  users: UserRow[];
  assocUsers: AssocUserRow[];
  onSaved?: (userId: number, restaurantCodes: string[]) => void | Promise<void>;
};

export function UserRestaurantAssign({ users, assocUsers, onSaved }: Props) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(restaurants.length / pageSize));
  const pageItems = restaurants.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const userRestaurants = useMemo(
    () =>
      assocUsers.reduce<Record<number, string[]>>((acc, u) => {
        acc[u.id] = u.restaurants.map((r) => r.code);
        return acc;
      }, {}),
    [assocUsers]
  );

  async function loadRestaurants() {
    try {
      const data = await listRestaurants();
      setRestaurants(data);
      setPage(1);
    } catch (error: unknown) {
      const e = error as { message?: string };
      setMsg(`❌ ${e?.message ?? "Erreur"}`);
    }
  }

  useEffect(() => {
    loadRestaurants();
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
      setMsg("❌ Sélectionne un utilisateur.");
      return;
    }

    try {
      setSaveBusy(true);
      await setUserRestaurants(Number(selectedUserId), selectedCodes);
      onSaved?.(Number(selectedUserId), selectedCodes);
      setMsg("✅ Associations mises à jour.");
    } catch (error: unknown) {
      const e = error as { message?: string };
      setMsg(`❌ ${e?.message ?? "Erreur"}`);
    } finally {
      setSaveBusy(false);
      setConfirmSaveOpen(false);
    }
  }

  function requestSave() {
    setMsg(null);
    if (!selectedUserId) {
      setMsg("❌ Sélectionne un utilisateur.");
      return;
    }
    setConfirmSaveOpen(true);
  }

  const selectedUser = users.find((u) => u.id === Number(selectedUserId));
  const selectedUserLabel = selectedUser
    ? selectedUser.first_name || selectedUser.last_name
      ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim()
      : selectedUser.email
    : "utilisateur";

  return (
    <Card>
      <ConfirmDialog
        open={confirmSaveOpen}
        title="Confirmer la mise à jour des associations ?"
        description={`Utilisateur: ${selectedUserLabel}\nRestaurants sélectionnés: ${selectedCodes.length || 0}`}
        confirmLabel="Confirmer"
        confirmVariant="default"
        busyLabel="Enregistrement..."
        busy={saveBusy}
        onCancel={() => setConfirmSaveOpen(false)}
        onConfirm={save}
      />
      <CardHeader>
        <CardTitle className="text-base">Création / mise à jour des associations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Utilisateur</div>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Sélectionner...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {(u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : u.email)} ({u.role})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Restaurants</div>
          {restaurants.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun restaurant pour l'instant.</div>
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
                        prev.includes(r.code) ? prev.filter((c) => c !== r.code) : [...prev, r.code]
                      );
                    }}
                  >
                    {r.code}
                  </Button>
                );
              })}
            </div>
          )}

        </div>

        {restaurants.length > pageSize && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
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
          <Button onClick={requestSave}>Enregistrer</Button>
        </div>
        {msg && <div className="text-sm whitespace-pre-wrap">{msg}</div>}
      </CardContent>
    </Card>
  );
}

