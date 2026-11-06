"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { gsap, isReducedMotion } from "@/lib/animation/gsap";
import {
  Menu,
  X,
  LogIn,
  LogOut,
  UserCheck,
  MapPin,
  Sparkles,
  Heart,
  Brain,
  HelpCircle,
  Home,
  ChevronRight,
} from "lucide-react";

export interface HeaderUser {
  name: string;
  role: "ADMIN" | "PATIENT";
}

export interface MiniSiteHeaderProps {
  logoHorizontalUrl?: string | null;
  logoUrl?: string | null;
  clinicName?: string;
  professionalName?: string;
  shouldShowLocation?: boolean;
  currentUser?: HeaderUser | null;
}

export function MiniSiteHeader({
  logoHorizontalUrl,
  logoUrl,
  clinicName = "Consultório de Psicologia",
  professionalName,
  shouldShowLocation = false,
  currentUser = null,
}: MiniSiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(currentUser);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("inicio");

  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);

  // Nome neutro de fallback que NUNCA utiliza a marca interna "PSI"
  const neutralFallbackName =
    clinicName && clinicName !== "PSI"
      ? clinicName
      : professionalName || "Consultório de Psicologia";

  // Sincroniza sessão no cliente caso tenha ocorrido login/logout em outra aba ou via router
  useEffect(() => {
    setIsLoadingAuth(true);
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser({
            name: data.user.name || data.user.fullName || "Usuário",
            role: data.role,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingAuth(false);
      });
  }, []);

  // Monitora scroll para ativar efeito de sombra e fundo translúcido
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Detecção automática da seção ativa conforme a rolagem da página
  useEffect(() => {
    const sectionIds = ["inicio", "atendimentos", "sobre", "diferenciais", "como-funciona"];
    if (shouldShowLocation) sectionIds.push("localizacao");

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 130;
      let current = "inicio";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            current = id;
          }
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldShowLocation]);

  // Micro-animação de entrada inicial via GSAP
  useEffect(() => {
    if (isReducedMotion()) return;

    const ctx = gsap.context(() => {
      if (logoRef.current) {
        gsap.from(logoRef.current, {
          opacity: 0,
          x: -14,
          duration: 0.55,
          ease: "power2.out",
        });
      }
      if (pillRef.current) {
        gsap.from(pillRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.96,
          duration: 0.65,
          delay: 0.08,
          ease: "power3.out",
        });
      }
      if (authRef.current) {
        gsap.from(authRef.current, {
          opacity: 0,
          x: 14,
          duration: 0.55,
          delay: 0.12,
          ease: "power2.out",
        });
      }
    }, headerRef);

    return () => ctx.revert();
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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 76;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setIsMenuOpen(false);
      window.location.href = "/";
    }
  };

  const dashboardUrl = user?.role === "ADMIN" ? "/admin" : "/paciente";

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 backdrop-blur-md shadow-xs border-b border-slate-200/80 py-2 sm:py-2.5"
          : "bg-white/70 backdrop-blur-sm border-b border-slate-200/40 py-2.5 sm:py-3.5"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* ================= 1. CABEÇALHO MOBILE (< 768px) ================= */}
      <div className="flex md:hidden items-center justify-between w-full h-14 px-4">
        {/* LADO ESQUERDO: Logo Horizontal Oficial Sem Rótulo "PSI" */}
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center focus:outline-none"
          aria-label="Página inicial"
        >
          {logoHorizontalUrl ? (
            <img
              src={logoHorizontalUrl}
              alt={neutralFallbackName}
              className="h-8 w-auto max-w-[190px] sm:max-w-[220px] object-contain transition-transform active:scale-98"
            />
          ) : logoUrl ? (
            <img
              src={logoUrl}
              alt={neutralFallbackName}
              className="h-8 w-auto max-w-[140px] object-contain rounded-sm"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-serif font-black text-lg">
                Ψ
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                {neutralFallbackName}
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

      {/* ================= 2. CABEÇALHO DESKTOP (>= 768px: PREMIUM PILL NAVIGATION) ================= */}
      <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-6xl mx-auto px-4 lg:px-6">
        {/* LADO ESQUERDO: Logo Horizontal Oficial Sem Rótulo "PSI" */}
        <div ref={logoRef} className="flex items-center justify-start">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-[var(--primary)] group shrink-0 focus:outline-none"
            aria-label="Página inicial"
          >
            {logoHorizontalUrl ? (
              <img
                src={logoHorizontalUrl}
                alt={neutralFallbackName}
                className="h-8 md:h-9 w-auto max-w-[210px] lg:max-w-[240px] object-contain transition-transform group-hover:scale-[1.02]"
              />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={neutralFallbackName}
                className="h-8 w-auto max-w-[160px] object-contain rounded-sm"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-serif font-black text-lg">
                  Ψ
                </div>
                <span className="text-base lg:text-lg tracking-tight font-semibold text-slate-900">
                  {neutralFallbackName}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* CENTRO: Cápsula de Navegação Flutuante Centralizada (Floating Pill Navigation) */}
        <div ref={pillRef} className="flex items-center justify-center">
          <nav
            aria-label="Navegação principal"
            className="inline-flex items-center p-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E7E2DA] shadow-[0_2px_14px_rgba(0,0,0,0.04)] text-xs transition-all duration-300"
          >
            <a
              href="#inicio"
              onClick={(e) => scrollToSection(e, "inicio")}
              className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                activeSection === "inicio"
                  ? "text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
              }`}
              style={activeSection === "inicio" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              Início
            </a>
            <a
              href="#atendimentos"
              onClick={(e) => scrollToSection(e, "atendimentos")}
              className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                activeSection === "atendimentos"
                  ? "text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
              }`}
              style={activeSection === "atendimentos" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              Atendimentos
            </a>
            <a
              href="#sobre"
              onClick={(e) => scrollToSection(e, "sobre")}
              className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                activeSection === "sobre"
                  ? "text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
              }`}
              style={activeSection === "sobre" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              Sobre Mim
            </a>
            <a
              href="#diferenciais"
              onClick={(e) => scrollToSection(e, "diferenciais")}
              className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                activeSection === "diferenciais"
                  ? "text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
              }`}
              style={activeSection === "diferenciais" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              Diferenciais
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => scrollToSection(e, "como-funciona")}
              className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                activeSection === "como-funciona"
                  ? "text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
              }`}
              style={activeSection === "como-funciona" ? { backgroundColor: "var(--primary)" } : undefined}
            >
              Como Funciona
            </a>
            {shouldShowLocation && (
              <a
                href="#localizacao"
                onClick={(e) => scrollToSection(e, "localizacao")}
                className={`px-3.5 py-1.5 rounded-full font-heading font-medium text-xs tracking-tight transition-all duration-200 cursor-pointer select-none ${
                  activeSection === "localizacao"
                    ? "text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.03]"
                }`}
                style={activeSection === "localizacao" ? { backgroundColor: "var(--primary)" } : undefined}
              >
                Localização
              </a>
            )}
          </nav>
        </div>

        {/* LADO DIREITO: Autenticação (Pill arredondado de Login ou Usuário) */}
        <div ref={authRef} className="flex items-center justify-end gap-2.5 shrink-0">
          {isLoadingAuth ? (
            <div className="w-20 h-8 rounded-full bg-slate-100 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={dashboardUrl}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200/90 hover:border-[var(--primary)]/50 bg-white/90 hover:bg-[var(--primary)]/5 text-slate-800 text-xs font-heading font-semibold shadow-2xs transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 group"
                aria-label={`Acessar painel (${user.name})`}
              >
                <UserCheck className="h-3.5 w-3.5 text-[var(--primary)] group-hover:scale-105 transition-transform" />
                <span className="max-w-[130px] truncate">{user.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200/90 hover:border-[var(--primary)]/60 bg-white/90 hover:bg-[var(--primary)]/5 text-slate-700 hover:text-[var(--primary)] text-xs font-heading font-semibold shadow-2xs transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              >
                <LogIn className="h-3.5 w-3.5 text-slate-500" />
                <span>Login</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ================= 3. MENU MÓVEL EXPANSÍVEL (DRAWER OVERLAY) ================= */}
      {isMenuOpen && (
        <>
          {/* Fundo Escurecido com Fechamento ao Tocar */}
          <div
            className="fixed inset-0 top-14 bg-slate-950/40 backdrop-blur-xs z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Painel de Navegação Móvel */}
          <div
            id="mobile-navigation-menu"
            className="absolute top-full left-0 w-full bg-white border-b border-slate-200/90 shadow-2xl z-40 md:hidden animate-in slide-in-from-top-3 duration-200 ease-out flex flex-col max-h-[calc(100vh-3.5rem)] overflow-y-auto"
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

              {/* Autenticação no Mobile (Sem botão de Agendamento) */}
              <div className="pt-1 pb-2">
                {isLoadingAuth ? (
                  <div className="w-full h-12 rounded-xl bg-slate-100 animate-pulse" />
                ) : user ? (
                  <div className="space-y-2">
                    <Link
                      href={dashboardUrl}
                      onClick={handleLinkClick}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold text-slate-800 bg-[var(--primary)]/8 hover:bg-[var(--primary)]/15 text-[var(--primary)] transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <UserCheck className="h-4 w-4 text-[var(--primary)]" />
                        <span className="truncate max-w-[190px]">{user.name}</span>
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)] text-white px-2.5 py-0.5 rounded-full">
                        {user.role === "ADMIN" ? "Admin" : "Paciente"}
                      </span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                ) : (
                  <Link href="/login" onClick={handleLinkClick} className="block w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full gap-2 text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl py-6 cursor-pointer shadow-xs"
                    >
                      <LogIn className="h-4 w-4 text-slate-600" />
                      <span>Login</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
