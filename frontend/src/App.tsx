import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/Login";
import DashboardShell from "@/components/dashboard/DashboardShell";
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
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoggedIn={() => setIsLogged(true)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/mes-imports" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/historiques-imports" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/bk-mensuel" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/comparaison" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/revue-direction" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/administration" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/dev" element={<Navigate to="/administration" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

