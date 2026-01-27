const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Certaines routes peuvent ne pas renvoyer du json; ici c’est du json
  return res.json();
}

export async function login(email: string, password: string) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }) as Promise<{ access_token: string; token_type: string }>;
}

export async function me() {
  return request("/auth/me") as Promise<{
    id: number;
    email: string;
    role: string;
    is_active: boolean;
  }>;
}

export async function createUser(email: string, password: string, role: string) {
  return request("/debug/create-user", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  }) as Promise<{ id: number; email: string; role: string }>;
}

export async function adminPing() {
  return request("/admin/ping") as Promise<{ ok: boolean; scope: string }>;
}

export async function auditLatest(limit = 50) {
  return request(`/audit/latest?limit=${limit}`) as Promise<
    Array<{ id: number; action: string; actor_email: string; target: string; timestamp: string }>
  >;
}
