"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Calendar,
  User,
  MapPin,
  Sparkles,
  Heart,
  Brain,
  HelpCircle,
  Home,
  ChevronRight,
} from "lucide-react";

export interface MiniSiteHeaderProps {
  logoHorizontalUrl?: string | null;
  logoUrl?: string | null;
  clinicName?: string;
  shouldShowLocation?: boolean;
}

export function MiniSiteHeader({
  logoHorizontalUrl,
  logoUrl,
  clinicName = "Consultório de Psicologia",
  shouldShowLocation = false,
}: MiniSiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Monitora scroll para ativar efeito de sombra e fundo translúcido
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fecha o menu móvel ao redimensionar para telas desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMenuOpen]);

  // Fecha o menu ao pressionar a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  // Previne rolagem excessiva do fundo quando o menu móvel está aberto
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200/80"
          : "bg-white/85 backdrop-blur-sm border-b border-slate-200/50"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* ================= 1. CABEÇALHO MOBILE (< 768px) ================= */}
      <div className="flex md:hidden items-center justify-between w-full h-16 px-4">
        {/* LADO ESQUERDO: Logo Horizontal Configurado */}
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center focus:outline-none"
          aria-label="Página inicial"
        >
          {logoHorizontalUrl ? (
            <img
              src={logoHorizontalUrl}
              alt={clinicName}
              className="h-9 w-auto max-w-[190px] sm:max-w-[220px] object-contain transition-transform active:scale-98"
            />
          ) : logoUrl ? (
            <div className="flex items-center gap-2">
              <img
                src={logoUrl}
                alt={clinicName}
                className="h-8 w-auto max-w-[140px] object-contain rounded-sm"
              />
              {clinicName && clinicName !== "PSI" && (
                <span className="text-sm font-semibold tracking-tight text-slate-900 truncate max-w-[130px]">
                  {clinicName}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-serif font-black text-lg">
                Ψ
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                {clinicName}
              </span>
            </div>
          )}
        </Link>

        {/* LADO DIREITO: Botão Hamburguer */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-label={isMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation-menu"
          className="p-2 -mr-1 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* ================= 2. CABEÇALHO DESKTOP (>= 768px) ================= */}
      <div className="hidden md:flex items-center justify-between w-full h-16 max-w-5xl mx-auto px-4">
        {/* LADO ESQUERDO: Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-bold text-[var(--primary)] group shrink-0"
          aria-label="Página inicial"
        >
          {logoHorizontalUrl ? (
            <img
              src={logoHorizontalUrl}
              alt={clinicName}
              className="h-9 w-auto max-w-[210px] lg:max-w-[240px] object-contain transition-transform group-hover:scale-102"
            />
          ) : logoUrl ? (
            <div className="flex items-center gap-2.5">
              <img
                src={logoUrl}
                alt={clinicName}
                className="h-8 w-8 object-contain rounded-md"
              />
              <span className="text-base lg:text-lg tracking-tight font-semibold text-slate-900">
                {clinicName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-serif font-black text-lg">
                Ψ
              </div>
              <span className="text-base lg:text-lg tracking-tight font-semibold text-slate-900">
                {clinicName}
              </span>
            </div>
          )}
        </Link>

        {/* CENTRO: Links de Navegação da Página */}
        <nav className="flex items-center gap-4 lg:gap-6 text-xs uppercase tracking-wider font-semibold text-slate-600">
          <a
            href="#inicio"
            className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
          >
            Início
          </a>
          <a
            href="#atendimentos"
            className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
          >
            Atendimentos
          </a>
          <a
            href="#sobre"
            className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
          >
            Sobre Mim
          </a>
          <a
            href="#diferenciais"
            className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
          >
            Diferenciais
          </a>
          <a
            href="#como-funciona"
            className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
          >
            Como Funciona
          </a>
          {shouldShowLocation && (
            <a
              href="#localizacao"
              className="hover:text-[var(--primary)] transition-colors py-1.5 focus:outline-none focus:text-[var(--primary)]"
            >
              Localização
            </a>
          )}
        </nav>

        {/* LADO DIREITO: Botões de Ação */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Área do Paciente
            </Button>
          </Link>
          <Link href="/agendar">
            <Button
              size="sm"
              className="gap-1.5 text-xs shadow-xs bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Agendar Consulta</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ================= 3. MENU MÓVEL EXPANSÍVEL (DRAWER OVERLAY) ================= */}
      {isMenuOpen && (
        <>
          {/* Fundo Escurecido com Fechamento ao Tocar */}
          <div
            className="fixed inset-0 top-16 bg-slate-950/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Painel de Navegação Móvel */}
          <div
            id="mobile-navigation-menu"
            className="absolute top-full left-0 w-full bg-white border-b border-slate-200/90 shadow-2xl z-40 md:hidden animate-in slide-in-from-top-3 duration-200 ease-out flex flex-col max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="px-5 py-5 space-y-4">
              {/* Lista de Seções */}
              <div className="flex flex-col space-y-1">
                <a
                  href="#inicio"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Home className="h-4 w-4 text-[var(--primary)]" />
                    <span>Início</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                <a
                  href="#atendimentos"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Brain className="h-4 w-4 text-[var(--primary)]" />
                    <span>Atendimentos</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                <a
                  href="#sobre"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Heart className="h-4 w-4 text-[var(--primary)]" />
                    <span>Sobre Mim</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                <a
                  href="#diferenciais"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-[var(--primary)]" />
                    <span>Diferenciais</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                <a
                  href="#como-funciona"
                  onClick={handleLinkClick}
                  className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="h-4 w-4 text-[var(--primary)]" />
                    <span>Como Funciona</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </a>

                {shouldShowLocation && (
                  <a
                    href="#localizacao"
                    onClick={handleLinkClick}
                    className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-[var(--primary)]" />
                      <span>Localização</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </a>
                )}
              </div>

              {/* Divisor */}
              <div className="pt-2 border-t border-slate-100" />

              {/* Botões de Ação Principais no Mobile */}
              <div className="space-y-2.5 pt-1 pb-2">
                <Link href="/agendar" onClick={handleLinkClick} className="block w-full">
                  <Button
                    size="lg"
                    className="w-full gap-2 text-sm font-bold shadow-md bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-white rounded-xl py-6 cursor-pointer"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Agendar Consulta</span>
                  </Button>
                </Link>

                <Link href="/login" onClick={handleLinkClick} className="block w-full">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2 text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl py-6 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-slate-500" />
                    <span>Área do Paciente</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
