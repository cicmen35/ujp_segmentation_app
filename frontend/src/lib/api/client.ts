import type {
  AuthUser,
  CopiedStorageItem,
  FolderTreeResponse,
  PromptPreset,
  SaveSessionPromptMetadata,
  SavedSessionResponse,
  SamPreprocessingMode,
  SaveSessionResponse,
  StorageItemKind,
  StorageScope,
  UserListItem,
} from "./types";

const API = import.meta.env.VITE_API_BASE_URL || "/api";
const ENABLE_DEV_AUTH_BYPASS = import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS === "true";

export class SessionSaveConflictError extends Error {
  sessionName: string;

  constructor(sessionName: string, message = "Session already exists") {
    super(message);
    this.name = "SessionSaveConflictError";
    this.sessionName = sessionName;
  }
}

async function readError(response: Response) {
  const text = await response.text();
  if (!text) {
    return "Request failed";
  }

  try {
    const data = JSON.parse(text);
    if (typeof data?.detail === "string") {
      return data.detail;
    }
  } catch {
    // Fall back to the raw text when the response is not JSON.
  }

  return text;
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

export function fetchPromptPreset() {
  return fetchJson<PromptPreset | null>("/auth/prompt-preset");
}

export async function savePromptPreset(preset: PromptPreset) {
  await fetchJson<{ message: string }>("/auth/prompt-preset", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preset),
  });
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

export function buildFileContentUrl(scope: StorageScope, path: string) {
  const params = new URLSearchParams({ scope, path });
  return `${API}/files/content?${params.toString()}`;
}

async function fetchProtectedBlob(scope: StorageScope, path: string) {
  const response = await fetch(buildFileContentUrl(scope, path), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return response.blob();
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

export async function deleteFolder(scope: StorageScope, path: string) {
  const params = new URLSearchParams({
    scope,
    path,
  });
  await fetchJson<{ message: string }>(`/files/folders?${params.toString()}`, {
    method: "DELETE",
  });
}

export function renameItem(scope: StorageScope, path: string, newName: string, kind: StorageItemKind) {
  return fetchJson<{ scope: StorageScope; path: string; name: string; kind: StorageItemKind }>("/files/items", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope,
      path,
      new_name: newName,
      kind,
    }),
  });
}

export function copyItem(
  copiedItem: CopiedStorageItem,
  destinationScope: StorageScope,
  destinationParentPath: string | null,
  replace = false,
  newName?: string,
) {
  return fetchJson<{ scope: StorageScope; path: string; name: string; kind: StorageItemKind }>("/files/items/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_scope: copiedItem.sourceScope,
      source_path: copiedItem.path,
      destination_scope: destinationScope,
      destination_parent_path: destinationParentPath,
      kind: copiedItem.kind,
      replace,
      new_name: newName,
    }),
  });
}

export async function saveSession(
  originalImage: File,
  maskBlob: Blob,
  scope: StorageScope,
  parentPath: string | null,
  promptMetadata?: SaveSessionPromptMetadata,
  options?: { sessionName?: string; replace?: boolean },
) {
  const originalStem = originalImage.name.replace(/\.[^.]+$/, "") || "image";
  const formData = new FormData();
  formData.append("original_image", originalImage);
  formData.append("mask_image", new File([maskBlob], `${originalStem}_mask.png`, { type: "image/png" }));
  formData.append("scope", scope);
  formData.append("parent_path", parentPath ?? "");
  if (options?.sessionName) {
    formData.append("session_name", options.sessionName);
  }
  if (options?.replace) {
    formData.append("replace", "true");
  }
  if (promptMetadata) {
    formData.append("prompt_metadata", JSON.stringify(promptMetadata));
  }

  const response = await fetch(`${API}/files/save-session`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 409) {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          const detail = data?.detail;
          if (detail?.code === "session_exists" && typeof detail?.session_name === "string") {
            throw new SessionSaveConflictError(detail.session_name, detail.message);
          }
        } catch (error) {
          if (error instanceof SessionSaveConflictError) {
            throw error;
          }
        }
      }
    }

    throw new Error(await readError(response));
  }

  return response.json() as Promise<SaveSessionResponse>;
}

export async function loadSavedSession(scope: StorageScope, path: string) {
  const params = new URLSearchParams({ scope, path });
  const session = await fetchJson<SavedSessionResponse>(`/files/session?${params.toString()}`);
  const [originalBlob, maskBlob] = await Promise.all([
    fetchProtectedBlob(scope, session.original_image_path),
    fetchProtectedBlob(scope, session.mask_image_path),
  ]);

  return {
    ...session,
    originalFile: new File([originalBlob], session.original_image_name, {
      type: originalBlob.type || "application/octet-stream",
    }),
    maskUrl: URL.createObjectURL(maskBlob),
  };
}

export async function samSegment(
  file: File,
  prompt: Record<string, unknown>,
  preprocessing: SamPreprocessingMode = "none",
) {
  const fd = new FormData();
  fd.append("image", file);
  fd.append("prompt", JSON.stringify(prompt));
  fd.append("preprocessing", preprocessing);

  const res = await fetch(`${API}/sam/segment`, {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());

  const blob = await res.blob(); // image/png
  return URL.createObjectURL(blob);
}
