const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function api<T = Record<string, unknown>>(
  path: string,
  opts: {
    method?: string;
    body?: Record<string, unknown>;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ja_token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Request failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export async function apiUpload<T = Record<string, unknown>>(
  path: string,
  file: File
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ja_token") : null;

  const formData = new FormData();
  formData.append("resume", file);

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || `Upload failed: ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export async function trackActivity(action: string, metadata: Record<string, unknown> = {}) {
  try {
    await api("/activity", { method: "POST", body: { action, metadata } });
  } catch {
    // Silent fail for tracking
  }
}
