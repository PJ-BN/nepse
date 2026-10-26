export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Server components run inside the web container and reach the API by service name.
const baseUrl = () => (typeof window === "undefined" ? process.env.API_INTERNAL_URL ?? API_URL : API_URL);

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json() as Promise<T>;
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail ?? `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}
