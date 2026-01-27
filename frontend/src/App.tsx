import { useEffect, useState } from "react";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";

export default function App() {
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLogged(!!token);
  }, []);

  if (!isLogged) {
    return <LoginPage onLoggedIn={() => setIsLogged(true)} />;
  }

  return <DashboardPage onLoggedOut={() => setIsLogged(false)} />;
}
