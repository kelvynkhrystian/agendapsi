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

  useEffect(() => {
    if (!isAuthRoute) {
      document.documentElement.classList.remove("dark");
      return;
    }

    const saved = localStorage.getItem("psi_theme") as Theme | null;
    if (saved === "light" || saved === "dark") {
      setThemeState(saved);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
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
    localStorage.setItem("psi_theme", newTheme);
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
