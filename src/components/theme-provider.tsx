"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

  // Regra Estrita de Isolamento de Modo Escuro:
  // Modo escuro é permitido e preservado EXCLUSIVAMENTE nas rotas autenticadas (/admin/* e /paciente/*).
  // O MiniSite público e telas abertas operam SEMPRE no modo claro.
  const isAuthRoute = pathname.startsWith("/admin") || pathname.startsWith("/paciente");

  const getStorageKey = (path: string) => {
    if (path.startsWith("/admin")) return "psi_theme_admin";
    if (path.startsWith("/paciente")) return "psi_theme_patient";
    return null;
  };

  useEffect(() => {
    if (!isAuthRoute) {
      document.documentElement.classList.remove("dark");
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

    if (saved === "light" || saved === "dark") {
      setThemeState(saved as Theme);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    } else {
      setThemeState("light");
      document.documentElement.classList.remove("dark");
    }
  }, [pathname, isAuthRoute]);

  const setTheme = (newTheme: Theme) => {
    if (!isAuthRoute) return;
    setThemeState(newTheme);
    const storageKey = getStorageKey(pathname);

    if (storageKey === "psi_theme_admin") {
      localStorage.setItem("psi_theme_admin", newTheme);
      localStorage.setItem("psi_theme", newTheme);
    } else if (storageKey === "psi_theme_patient") {
      localStorage.setItem("psi_theme_patient", newTheme);
    }

    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const toggleTheme = () => {
    if (!isAuthRoute) return;
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: isAuthRoute ? theme : "light",
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
