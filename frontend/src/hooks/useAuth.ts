import { useState } from "react";
import { logout as apiLogout } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      localStorage.removeItem("access_token");
    }
  }

  return {
    user,
    setUser,
    logout,
  };
}
