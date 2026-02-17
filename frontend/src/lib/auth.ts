import { apiFetch, setAccessToken } from "@/lib/api";

export async function login(email: string, password: string) {
  const data = await apiFetch<{
    access_token: string;
    expires_at: string;
    must_change_password: boolean;
  }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );

  setAccessToken(data.access_token);
  localStorage.setItem("expires_at", data.expires_at);
  return data;
}

export async function logout() {
  // logout a besoin du Bearer (get_current_user) + supprime cookie refresh côté back
  await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
  setAccessToken(null);
  localStorage.removeItem("expires_at");
}

export async function createUser(payload: {
  email: string;
  password?: string;
  role: "ADMIN" | "MANAGER" | "READONLY" | "DEV";
  first_name?: string | null;
  last_name?: string | null;
}) {
  return apiFetch<{
    id: number;
    email: string;
    role: string;
    first_name?: string | null;
    last_name?: string | null;
    must_change_password: boolean;
    email_sent: boolean;
    email_error?: string | null;
  }>("/debug/create-user", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function changePasswordFirstLogin(payload: {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}) {
  return apiFetch<{ ok: boolean }>("/auth/change-password-first-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listUsers() {
  return apiFetch<Array<{
    id: number;
    email: string;
    role: string;
    is_active: boolean;
    first_name?: string | null;
    last_name?: string | null;
  }>>(
    "/debug/users"
  );
}

export async function deleteUser(userId: number) {
  return apiFetch<{ ok: boolean }>(`/debug/users/${userId}`, { method: "DELETE" });
}
