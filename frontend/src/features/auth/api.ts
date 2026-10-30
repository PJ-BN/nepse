import { getJson, postJson } from "@/shared/api/http";
import type { TokenResponse, User } from "./types";

export async function loginUser(email: string, password: string): Promise<TokenResponse> {
  return postJson<TokenResponse>("/api/v1/auth/login", { email, password });
}

export async function registerUser(email: string, password: string): Promise<TokenResponse> {
  return postJson<TokenResponse>("/api/v1/auth/register", { email, password });
}

export async function fetchCurrentUser(token?: string): Promise<User> {
  return getJson<User>("/api/v1/auth/me", token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
}
