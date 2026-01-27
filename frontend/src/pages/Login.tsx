import { useState } from "react";
import { login } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (e: any) {
        if (e?.name === "ApiError" && e.status === 401) {
            setError("Email ou mot de passe incorrect.");
        } else {
            setError("Une erreur est survenue lors de la connexion.");
        }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Projet Restau</h1>
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-base">Se connecter</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Email</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Mot de passe</div>
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  type="password"
                />
              </div>

              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Connexion…" : "Se connecter"}
              </Button>

              {error && (
                <div className="text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center">
          MVP : Auth / Admin / Audit. Le design viendra, la fiabilité d’abord.
        </div>
      </div>
    </div>
  );
}
