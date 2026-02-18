import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/components/admin/types";

type Props = {
  isDev: boolean;
  isAdmin: boolean;
  newFirstName: string;
  setNewFirstName: (value: string) => void;
  newLastName: string;
  setNewLastName: (value: string) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  newRole: UserRole;
  setNewRole: (value: UserRole) => void;
  handleCreateUser: () => void;
};

export function UserCreationCard({
  isDev,
  isAdmin,
  newFirstName,
  setNewFirstName,
  newLastName,
  setNewLastName,
  newEmail,
  setNewEmail,
  newRole,
  setNewRole,
  handleCreateUser,
}: Props) {
  const trimmedEmail = newEmail.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const roleAllowed = !isAdmin || newRole === "READONLY" || newRole === "MANAGER";
  const canCreateUser = Boolean(trimmedEmail) && emailLooksValid && roleAllowed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Creation d'utilisateur ({isDev ? "DEV" : "ADMIN"})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-sm text-muted-foreground md:text-base">Prenom</div>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Jean"
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground md:text-base">Nom</div>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Dupont"
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground md:text-base">Email</div>
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@restau.com"
            />
          </div>
          <div>
            <div className="mb-1 text-sm text-muted-foreground md:text-base">Role</div>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
            >
              <option value="READONLY">READONLY</option>
              <option value="MANAGER">MANAGER</option>
              {isDev && <option value="ADMIN">ADMIN</option>}
              {isDev && <option value="DEV">DEV</option>}
            </select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Le mot de passe temporaire est genere automatiquement et envoye par email. L'utilisateur devra le changer a sa
          premiere connexion.
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleCreateUser} disabled={!canCreateUser}>
            Creer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
