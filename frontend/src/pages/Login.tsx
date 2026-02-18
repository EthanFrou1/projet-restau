import type { FormEvent } from "react";
import { useState } from "react";
import { login } from "@/lib/auth";
import { LoginBrandHeader } from "@/components/auth/LoginBrandHeader";
import { LoginFormCard } from "@/components/auth/LoginFormCard";

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      onLoggedIn(Boolean(data.must_change_password));
    } catch (error: unknown) {
      const apiError = error as { name?: string; status?: number };
      if (apiError?.name === "ApiError" && apiError.status === 401) {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError("Une erreur est survenue lors de la connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md space-y-4">
        <LoginBrandHeader />
        <LoginFormCard
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          onSubmit={onSubmit}
        />

        <div className="text-center text-xs text-muted-foreground">
          MVP : Auth / Admin / Audit. Le design viendra, la fiabilite d'abord.
        </div>
      </div>
    </div>
  );
}
