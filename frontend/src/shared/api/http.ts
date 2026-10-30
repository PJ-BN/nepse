import { getAuthToken } from "@/features/auth/tokenStorage";

// In the browser, an empty API_URL allows relative calls ("/api/v1/...") which are proxied
// by Next.js rewrites to the backend, completely eliminating CORS and Mixed-Content issues.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : typeof window !== "undefined"
      ? ""
      : (process.env.API_INTERNAL_URL ?? "http://localhost:8000");

// Server components run inside the web container and reach the API by service name.
const baseUrl = () =>
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL ?? API_URL ?? "http://api:8000"
    : API_URL;

function buildHeaders(customHeaders?: HeadersInit, contentType = true): Headers {
  const headers = new Headers(customHeaders);
  if (contentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = buildHeaders(init?.headers, false);
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail ?? `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function postJson<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const headers = buildHeaders(init?.headers);
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail ?? `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function putJson<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const headers = buildHeaders(init?.headers);
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    method: "PUT",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail ?? `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function deleteJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = buildHeaders(init?.headers);
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.detail ?? `${res.status} ${res.statusText} on ${path}`);
  }
  return res.json() as Promise<T>;
}
