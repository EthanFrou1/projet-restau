import { parseApiError } from "@/lib/apiErrors";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = "last_activity_at";
const SESSION_LOST_EVENT = "auth:session-lost";

let accessToken: string | null = localStorage.getItem("access_token");

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

export function getAccessToken() {
  return accessToken;
}

export function markSessionActivity(at = Date.now()) {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(at));
}

export function getLastSessionActivity() {
  const value = localStorage.getItem(LAST_ACTIVITY_KEY);
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function clearAuthState() {
  setAccessToken(null);
  localStorage.removeItem("expires_at");
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export function notifySessionLost() {
  clearAuthState();
  window.dispatchEvent(new Event(SESSION_LOST_EVENT));
}

export function onSessionLost(handler: () => void) {
  window.addEventListener(SESSION_LOST_EVENT, handler);
  return () => window.removeEventListener(SESSION_LOST_EVENT, handler);
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
  markSessionActivity();
  return true;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (!isFormData) headers.set("Content-Type", "application/json");

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
      if (!isFormData) h2.set("Content-Type", "application/json");
      if (accessToken) h2.set("Authorization", `Bearer ${accessToken}`);

      res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: h2,
        credentials: "include",
      });
    } else {
      notifySessionLost();
    }
  }

  if (!res.ok) {
  let detail: unknown = null;
  try {
    detail = await res.json();
  } catch {
    detail = null;
  }

   throw parseApiError(res, detail);
 }

  markSessionActivity();
  return (await res.json()) as T;
}
