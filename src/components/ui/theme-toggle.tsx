"use client";

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { Button } from "./button";

export function ThemeToggle() {
  const { theme, toggleTheme, isDarkAllowed } = useTheme();

  // Dark mode é permitido EXCLUSIVAMENTE nas rotas autenticadas (/admin/* e /paciente/*)
  // O MiniSite e páginas públicas NUNCA exibem o seletor de tema escuro
  if (!isDarkAllowed) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        toggleTheme();
      }}
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="rounded-xl hover:bg-slate-100 dark:hover:bg-[#242424] text-slate-700 dark:text-[#F5F5F5] transition-colors cursor-pointer"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400 transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}
