"use client";

import { useSyncExternalStore } from "react";
import { getAuthToken, setAuthToken, subscribeAuthToken } from "@/features/auth/tokenStorage";

export const setToken = setAuthToken;

export function useToken(): string | null {
  return useSyncExternalStore(
    (notify) => subscribeAuthToken(() => notify()),
    getAuthToken,
    () => null,
  );
}
