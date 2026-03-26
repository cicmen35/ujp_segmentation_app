import type { AuthUser, UserListItem } from "./types";

const API = import.meta.env.VITE_API_BASE_URL;

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    // Fall back to plain text when the response is not JSON.
  }

  const text = await response.text();
  return text || "Request failed";
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<T>;
}

export function login(username: string, password: string) {
  return fetchJson<AuthUser>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, password: string) {
  return fetchJson<AuthUser>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function fetchCurrentUser() {
  return fetchJson<AuthUser>("/auth/me");
}

export async function logout() {
  await fetchJson<{ message: string }>("/auth/logout", { method: "POST" });
}

export async function deleteUser(username: string) {
  await fetchJson<{ message: string }>(`/auth/users/${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
}

export function fetchUsers(query: string, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  return fetchJson<UserListItem[]>(`/auth/users?${params.toString()}`);
}

export async function samSegment(file: File, prompt: any) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("prompt", JSON.stringify(prompt));

  const res = await fetch(`${API}/sam/segment`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob(); // image/png
  return URL.createObjectURL(blob);
}
