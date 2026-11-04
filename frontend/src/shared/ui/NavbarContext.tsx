"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export const NAVBAR_STORAGE_KEY = "nepse_navbar_visible";

export function parseNavbarVisible(
  value: string | null | undefined,
  defaultValue = true
): boolean {
  if (value === null || value === undefined) return defaultValue;
  return value === "true";
}

export function shouldToggleNavbarShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  targetTagName?: string;
  isContentEditable?: boolean;
}): boolean {
  if (
    event.targetTagName === "INPUT" ||
    event.targetTagName === "TEXTAREA" ||
    event.isContentEditable
  ) {
    return false;
  }
  return (
    Boolean(event.ctrlKey || event.metaKey) &&
    (event.key === "b" || event.key === "B")
  );
}

export interface NavbarContextType {
  isVisible: boolean;
  isMobileOpen: boolean;
  isMac: boolean;
  mounted: boolean;
  toggleNavbar: () => void;
  showNavbar: () => void;
  hideNavbar: () => void;
  setNavbarVisible: (visible: boolean) => void;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const NavbarContext = createContext<NavbarContextType | null>(null);

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize from localStorage and detect OS on client mount
  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined") {
        const platform = window.navigator?.platform || window.navigator?.userAgent || "";
        setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform));

        const saved = localStorage.getItem(NAVBAR_STORAGE_KEY);
        if (saved !== null) {
          setIsVisible(parseNavbarVisible(saved, true));
        }
      }
    } catch {}
  }, []);

  const setNavbarVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
    try {
      localStorage.setItem(NAVBAR_STORAGE_KEY, String(visible));
    } catch {}
  }, []);

  const toggleNavbar = useCallback(() => {
    setIsVisible((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(NAVBAR_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const showNavbar = useCallback(() => setNavbarVisible(true), [setNavbarVisible]);
  const hideNavbar = useCallback(() => setNavbarVisible(false), [setNavbarVisible]);
  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Global keyboard shortcut: Ctrl+B or Cmd+B to toggle navbar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (
        shouldToggleNavbarShortcut({
          key: e.key,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          targetTagName: active?.tagName,
          isContentEditable: active?.isContentEditable,
        })
      ) {
        e.preventDefault();
        toggleNavbar();
      } else if (e.key === "Escape" && isMobileOpen) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleNavbar, isMobileOpen]);

  const value = useMemo(
    () => ({
      isVisible,
      isMobileOpen,
      isMac,
      mounted,
      toggleNavbar,
      showNavbar,
      hideNavbar,
      setNavbarVisible,
      setMobileOpen,
      toggleMobile,
      closeMobile,
    }),
    [
      isVisible,
      isMobileOpen,
      isMac,
      mounted,
      toggleNavbar,
      showNavbar,
      hideNavbar,
      setNavbarVisible,
      toggleMobile,
      closeMobile,
    ]
  );

  return (
    <NavbarContext.Provider value={value}>{children}</NavbarContext.Provider>
  );
}

export function useNavbar(): NavbarContextType {
  const ctx = useContext(NavbarContext);
  if (!ctx) {
    throw new Error("useNavbar must be used within a NavbarProvider");
  }
  return ctx;
}
