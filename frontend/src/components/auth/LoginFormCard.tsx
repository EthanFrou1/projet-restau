import type { FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: FormEvent) => void;
};

export function LoginFormCard({
  email,
  password,
  showPassword,
  loading,
  error,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: Props) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Se connecter</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Email</div>
            <Input value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder="Email" />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Mot de passe</div>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Mot de passe"
                type={showPassword ? "text" : "password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Connexion..." : "Se connecter"}
          </Button>

          {error && <div className="whitespace-pre-wrap text-sm text-destructive">{error}</div>}
        </form>
      </CardContent>
    </Card>
  );
}
