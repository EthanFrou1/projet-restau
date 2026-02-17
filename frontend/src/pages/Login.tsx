import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import bkLogo from "@/assets/brand/burger-king-logo-2020.svg";

export default function LoginPage({
  onLoggedIn,
}: {
  onLoggedIn: (mustChangePassword: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      onLoggedIn(Boolean(data.must_change_password));
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
          <div className="-mt-10 mb-1 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-50/90 p-2 shadow-sm">
              <img src={bkLogo} alt="Burger King" className="h-20 w-20 object-contain" />
            </div>
          </div>
          <h1 className="font-brand text-3xl tracking-tight">Burger King</h1>
          <p className="text-sm text-muted-foreground">Portail de pilotage de vos restaurants</p>
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
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
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

              {error && (
                <div className="text-sm text-destructive whitespace-pre-wrap">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground text-center">
          MVP : Auth / Admin / Audit. Le design viendra, la fiabilité d'abord.
        </div>
      </div>
    </div>
  );
}
