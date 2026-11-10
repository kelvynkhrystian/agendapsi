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
      variant="outline"
      size="icon"
      onClick={(e) => {
        e.preventDefault();
        toggleTheme();
      }}
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="rounded-xl bg-white text-[var(--button-outline-fg,var(--primary))] border-[#E5E5E5] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#F5F5F5] dark:hover:bg-[#262626] transition-colors cursor-pointer"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-current transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}
