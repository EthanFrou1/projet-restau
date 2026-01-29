import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";

type Props = {
  email: string;
  role: string;
  onLogout: () => void;
};

export function TopBar({ email, role, onLogout }: Props) {
  return (
    <div className="border-b bg-background">
      <div className="mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Projet Restau</h1>
          <Badge variant="secondary">{role}</Badge>
        </div>

        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{email}</span>
            <Button variant="outline" size="sm" onClick={onLogout}>
                Logout
            </Button>
        </div>
      </div>
    </div>
  );
}
