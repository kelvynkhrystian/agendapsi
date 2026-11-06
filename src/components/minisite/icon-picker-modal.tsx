"use client";

import React, { useState, useMemo } from "react";
import { BUILTIN_ICONS, BuiltinIconDefinition } from "@/lib/minisite-icons";
import { ThemeIcon } from "./theme-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Check } from "lucide-react";

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconKey: string) => void;
  currentIconKey?: string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentIconKey,
}: IconPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");

  const filteredIcons = useMemo(() => {
    return BUILTIN_ICONS.filter((item) => {
      const matchCategory =
        selectedCategory === "todos" || item.category === selectedCategory;

      if (!matchCategory) return false;

      if (!search.trim()) return true;

      const term = search.toLowerCase();
      const matchName = item.name.toLowerCase().includes(term);
      const matchKey = item.key.toLowerCase().includes(term);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(term));

      return matchName || matchKey || matchKeywords;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Biblioteca de Ícones Integrada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha um ícone compatível com o tema visual global do consultório
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Busca e Categorias */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar ícone por nome (ex: coração, cérebro, flor, agenda)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
              autoFocus
            />
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: "todos", label: "Todos" },
              { id: "apoio", label: "Apoio & Acolhimento" },
              { id: "clinica", label: "Clínica & Saúde" },
              { id: "tempo", label: "Agenda & Tempo" },
              { id: "comunicacao", label: "Comunicação" },
              { id: "geral", label: "Geral" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  selectedCategory === cat.id
                    ? "bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)] shadow-xs"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Ícones com Scroll */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {filteredIcons.map((icon) => {
            const isSelected = currentIconKey === icon.key;
            return (
              <button
                key={icon.key}
                type="button"
                onClick={() => {
                  onSelect(icon.key);
                  onClose();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer relative group ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-xs ring-2 ring-[var(--primary)]/20"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)]">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform">
                  <ThemeIcon iconName={icon.key} className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <span className="text-[10px] font-medium line-clamp-2 leading-tight">
                  {icon.name}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-xs">
              Nenhum ícone encontrado para a busca &quot;{search}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
