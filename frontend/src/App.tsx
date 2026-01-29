import { useEffect, useState } from "react";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import { apiFetch } from "@/lib/api";

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLogged(false);
      setChecking(false);
      return;
    }

    (async () => {
      try {
        await apiFetch("/auth/me");
        setIsLogged(true);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("expires_at");
        setIsLogged(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return null;

  if (!isLogged) {
    return <LoginPage onLoggedIn={() => setIsLogged(true)} />;
  }

  return <DashboardPage onLoggedOut={() => setIsLogged(false)} />;
}
