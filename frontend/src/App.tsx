import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "@/pages/Login";
import ChangePasswordPage from "@/pages/ChangePassword";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { apiFetch } from "@/lib/api";

export default function App() {
  const [isLogged, setIsLogged] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLogged(false);
      setMustChangePassword(false);
      setChecking(false);
      return;
    }

    (async () => {
      try {
        const me = await apiFetch<{ must_change_password?: boolean }>("/auth/me");
        setIsLogged(true);
        setMustChangePassword(Boolean(me.must_change_password));
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("expires_at");
        setIsLogged(false);
        setMustChangePassword(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) return null;

  if (!isLogged) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onLoggedIn={(requiresPasswordChange) => {
                setIsLogged(true);
                setMustChangePassword(requiresPasswordChange);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (mustChangePassword) {
    return (
      <Routes>
        <Route
          path="/change-password"
          element={
            <ChangePasswordPage
              onDone={() => {
                setMustChangePassword(false);
              }}
            />
          }
        />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/change-password" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/mes-imports" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/historiques-imports" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/tableau-de-donnees" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/comparaison" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/donnees-globales" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/administration" element={<DashboardShell onLoggedOut={() => setIsLogged(false)} />} />
      <Route path="/dev" element={<Navigate to="/administration" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
