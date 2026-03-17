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
