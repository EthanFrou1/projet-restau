import { ApiError, parseApiError } from "@/lib/apiErrors";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let accessToken: string | null = localStorage.getItem("access_token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

export function getAccessToken() {
  return accessToken;
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include", // IMPORTANT pour cookie refresh_token
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { access_token: string; expires_at: string };
  setAccessToken(data.access_token);
  localStorage.setItem("expires_at", data.expires_at);
  return true;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");

  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const doReq = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include", // utile même si access token en header
    });

  let res = await doReq();

  // si token expiré → refresh → retry 1 fois
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const h2 = new Headers(init.headers || {});
      h2.set("Content-Type", "application/json");
      if (accessToken) h2.set("Authorization", `Bearer ${accessToken}`);

      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: h2,
        credentials: "include",
      });
    }
  }

  if (!res.ok) {
  let detail: any = null;
  try {
    detail = await res.json();
  } catch {}

   throw parseApiError(res, detail);
 }

  return (await res.json()) as T;
}
