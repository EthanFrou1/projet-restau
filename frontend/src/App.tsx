import { useEffect, useState } from "react";
import LoginPage from "@/pages/Login";
import DevPanelPage from "@/pages/DevPanel";

export default function App() {
  const [isLogged, setIsLogged] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setIsLogged(!!token);
  }, []);

  if (!isLogged) {
    return <LoginPage onLoggedIn={() => setIsLogged(true)} />;
  }

  return <DevPanelPage onLoggedOut={() => setIsLogged(false)}/>;
}
