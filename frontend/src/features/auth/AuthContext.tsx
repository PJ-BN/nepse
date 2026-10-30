"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { AuthContextType, User } from "./types";
import { fetchCurrentUser, loginUser, registerUser } from "./api";
import { getAuthToken, setAuthToken, subscribeAuthToken } from "./tokenStorage";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal UI state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // Load profile when token changes
  const loadUser = useCallback(async (authToken: string | null) => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const currentUser = await fetchCurrentUser(authToken);
      setUser(currentUser);
    } catch (err) {
      console.warn("Failed to load user session, resetting token:", err);
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial token read
    const initialToken = getAuthToken();
    setTokenState(initialToken);
    loadUser(initialToken);

    // Subscribe to external token changes (other tabs, portfolio logout, etc.)
    const unsubscribe = subscribeAuthToken((newToken) => {
      setTokenState(newToken);
      loadUser(newToken);
    });

    return () => unsubscribe();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await loginUser(email, password);
        setAuthToken(res.access_token);
        setTokenState(res.access_token);
        const currentUser = await fetchCurrentUser(res.access_token);
        setUser(currentUser);
        setIsAuthModalOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await registerUser(email, password);
        setAuthToken(res.access_token);
        setTokenState(res.access_token);
        const currentUser = await fetchCurrentUser(res.access_token);
        setUser(currentUser);
        setIsAuthModalOpen(false);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const openAuthModal = useCallback((mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      register,
      logout,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
    }),
    [user, token, isLoading, login, register, logout, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
