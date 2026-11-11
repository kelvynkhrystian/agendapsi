"use client";

import React, { useState, useMemo } from "react";
import { BUILTIN_ICONS, BuiltinIconDefinition } from "@/lib/minisite-icons";
import { ThemeIcon } from "./theme-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Check } from "pulsoicon-react";

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
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#171717] dark:text-[#F5F5F5]">
              Biblioteca de Ícones Integrada
            </h3>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6]">
              Escolha um ícone compatível com o tema visual global do consultório
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar biblioteca de ícones"
            className="p-1.5 rounded-lg bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#202020] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:text-[#F5F5F5] dark:hover:bg-[#292929] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de Busca e Categorias */}
        <div className="p-4 border-b border-[#E5E5E5] dark:border-[#2C2C2C] space-y-3 bg-[#F8F8F8] dark:bg-[#141414]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#737373] dark:text-[#A6A6A6]" />
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
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                  selectedCategory === cat.id
                    ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] border-transparent shadow-xs"
                    : "bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border-[var(--primary)]/25 hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#202020] dark:border-[#333333] dark:text-[#D0D0D0] dark:hover:bg-[#292929] dark:hover:text-[#F5F5F5]"
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
                    : "bg-white border-[#E5E5E5] hover:border-[var(--primary)]/45 hover:bg-[var(--primary)]/[0.03] text-[#404040] dark:bg-[#141414] dark:border-[#2C2C2C] dark:hover:border-[#444444] dark:hover:bg-[#202020] dark:text-[#D0D0D0]"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1 right-1 p-0.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)]">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
                <div className="p-2 rounded-lg bg-[#F8F8F8] dark:bg-[#202020] group-hover:scale-110 transition-transform">
                  <ThemeIcon iconName={icon.key} className="h-6 w-6 text-[var(--primary)]" />
                </div>
                <span className="text-[10px] font-medium line-clamp-2 leading-tight">
                  {icon.name}
                </span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center text-[#737373] dark:text-[#A6A6A6] text-xs">
              Nenhum ícone encontrado para a busca &quot;{search}&quot;.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#E5E5E5] dark:border-[#2C2C2C] bg-[#F8F8F8] dark:bg-[#141414] flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
