import type { AuthUser, FolderTreeResponse, SaveSessionResponse, StorageScope, UserListItem } from "./types";

const API = import.meta.env.VITE_API_BASE_URL;
const ENABLE_DEV_AUTH_BYPASS = import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS === "true";

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
  const path = `/auth/users/${encodeURIComponent(username)}`;

  try {
    await fetchJson<{ message: string }>(path, {
      method: "DELETE",
    });
  } catch (error) {
    if (!ENABLE_DEV_AUTH_BYPASS || !(error instanceof Error) || !error.message.includes("Not authenticated")) {
      throw error;
    }

    await fetchJson<{ message: string }>(`/auth/dev/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
  }
}

export function fetchUsers(query: string, limit = 5) {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  return fetchJson<UserListItem[]>(`/auth/users?${params.toString()}`);
}

export function fetchFolderTree() {
  return fetchJson<FolderTreeResponse>("/files/tree");
}

export function createFolder(scope: StorageScope, name: string, parentPath: string | null) {
  return fetchJson<{ name: string; path: string; scope: StorageScope }>("/files/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      name,
      parent_path: parentPath,
    }),
  });
}

export async function saveSession(
  originalImage: File,
  maskBlob: Blob,
  scope: StorageScope,
  parentPath: string | null,
) {
  const originalStem = originalImage.name.replace(/\.[^.]+$/, "") || "image";
  const formData = new FormData();
  formData.append("original_image", originalImage);
  formData.append("mask_image", new File([maskBlob], `${originalStem}_mask.png`, { type: "image/png" }));
  formData.append("scope", scope);
  formData.append("parent_path", parentPath ?? "");

  const response = await fetch(`${API}/files/save-session`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.json() as Promise<SaveSessionResponse>;
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
