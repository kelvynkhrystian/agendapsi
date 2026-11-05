"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDarkAllowed: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  isDarkAllowed: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Regra Estrita de Isolamento de Modo Escuro:
  // Modo escuro é permitido e preservado EXCLUSIVAMENTE nas rotas autenticadas (/admin/* e /paciente/*).
  // O MiniSite público e telas abertas operam SEMPRE no modo claro.
  const isAuthRoute = pathname.startsWith("/admin") || pathname.startsWith("/paciente");

  const getStorageKey = useCallback((path: string) => {
    if (path.startsWith("/admin")) return "psi_theme_admin";
    if (path.startsWith("/paciente")) return "psi_theme_patient";
    return null;
  }, []);

  const applyDomTheme = useCallback((isDark: boolean) => {
    if (typeof document === "undefined") return;
    const body = document.body;

    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      if (body) {
        body.classList.add("dark");
        body.setAttribute("data-theme", "dark");
      }
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
      if (body) {
        body.classList.remove("dark");
        body.setAttribute("data-theme", "light");
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!isAuthRoute) {
      applyDomTheme(false);
      setThemeState("light");
      return;
    }

    const storageKey = getStorageKey(pathname);
    let saved: string | null = null;

    if (storageKey === "psi_theme_admin") {
      saved = localStorage.getItem("psi_theme_admin") || localStorage.getItem("psi_theme");
    } else if (storageKey === "psi_theme_patient") {
      saved = localStorage.getItem("psi_theme_patient");
    }

    const wantsDark =
      saved === "dark" ||
      (!saved && typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const activeTheme: Theme = wantsDark ? "dark" : "light";
    setThemeState(activeTheme);
    applyDomTheme(wantsDark);
  }, [pathname, isAuthRoute, getStorageKey, applyDomTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (!isAuthRoute) return;
      setThemeState(newTheme);
      const isDark = newTheme === "dark";
      applyDomTheme(isDark);

      const storageKey = getStorageKey(pathname);
      if (storageKey === "psi_theme_admin") {
        localStorage.setItem("psi_theme_admin", newTheme);
        localStorage.setItem("psi_theme", newTheme);
      } else if (storageKey === "psi_theme_patient") {
        localStorage.setItem("psi_theme_patient", newTheme);
      }
    },
    [isAuthRoute, pathname, getStorageKey, applyDomTheme]
  );

  const toggleTheme = useCallback(() => {
    if (!isAuthRoute) return;
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }, [isAuthRoute, theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{
        theme: isAuthRoute && mounted ? theme : "light",
        toggleTheme,
        setTheme,
        isDarkAllowed: isAuthRoute,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
