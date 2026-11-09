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
    document.body.style.overflow = "";
  };

  const handleMobileNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    document.body.style.overflow = "";

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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 84;
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
      document.body.style.overflow = "";
      window.location.href = "/";
    }
  };

  const dashboardUrl = user?.role === "ADMIN" ? "/admin" : "/paciente";

  const mobileNavItems = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "atendimentos", label: "Atendimentos", icon: Brain },
    { id: "sobre", label: "Sobre Mim", icon: Heart },
    { id: "diferenciais", label: "Diferenciais", icon: Sparkles },
    { id: "como-funciona", label: "Como Funciona", icon: HelpCircle },
    ...(shouldShowLocation ? [{ id: "localizacao", label: "Localização", icon: MapPin }] : []),
  ];

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 w-full bg-transparent border-none shadow-none pointer-events-none transition-all duration-300 py-0 md:py-3.5 lg:py-4"
    >
      {/* ================= 1. CABEÇALHO MOBILE (< 768px: FLOATING ROUNDED PILL) ================= */}
      <div className="flex md:hidden w-full px-3 pt-3 sm:px-4 pointer-events-none relative z-50">
        <div
          className={`flex items-center justify-between w-full h-14 px-4 pointer-events-auto transition-all duration-200 relative z-50 ${
            isMenuOpen
              ? "bg-white rounded-t-2xl rounded-b-none border border-slate-200/90 border-b-slate-100 shadow-none"
              : isScrolled
              ? "bg-white/95 backdrop-blur-lg rounded-full border border-slate-200/70 shadow-[0_6px_24px_rgba(0,0,0,0.08)]"
              : "bg-white/40 backdrop-blur-md rounded-full border border-white/40 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:bg-white/60"
          }`}
          style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        >
          {/* LADO ESQUERDO: Logo Horizontal Oficial Sem Rótulo "PSI" */}
          <Link
            href="/"
            onClick={handleLinkClick}
            className="flex items-center focus:outline-none cursor-pointer"
            aria-label="Página inicial"
          >
            {logoHorizontalUrl ? (
              <img
                src={logoHorizontalUrl}
                alt={neutralFallbackName}
                className="h-7 sm:h-8 w-auto max-w-[170px] sm:max-w-[210px] object-contain transition-transform active:scale-98"
              />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={neutralFallbackName}
                className="h-7 sm:h-8 w-auto max-w-[130px] object-contain rounded-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-serif font-black text-base sm:text-lg">
                  Ψ
                </div>
                <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-900">
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
            className="p-2 rounded-full text-slate-700 hover:text-slate-950 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ================= 2. CABEÇALHO DESKTOP (>= 768px: PREMIUM PILL NAVIGATION) ================= */}
      <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-6xl xl:max-w-7xl mx-auto px-4 lg:px-6 pointer-events-none">
        {/* LADO ESQUERDO: Logo Horizontal Oficial Sem Rótulo "PSI" */}
        <div ref={logoRef} className="flex items-center justify-start pointer-events-auto">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-[var(--primary)] group shrink-0 focus:outline-none"
            aria-label="Página inicial"
          >
            {logoHorizontalUrl ? (
              <img
                src={logoHorizontalUrl}
                alt={neutralFallbackName}
                className="h-8 md:h-9 lg:h-10 w-auto max-w-[200px] lg:max-w-[240px] object-contain transition-transform group-hover:scale-[1.02]"
              />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={neutralFallbackName}
                className="h-8 md:h-9 w-auto max-w-[160px] object-contain rounded-sm"
              />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-[var(--primary)]/10 lg:bg-white/15 flex items-center justify-center text-[var(--primary)] lg:text-white font-serif font-black text-lg">
                  Ψ
                </div>
                <span className="text-base lg:text-lg tracking-tight font-semibold text-slate-900 lg:text-white">
                  {neutralFallbackName}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* CENTRO: Cápsula de Navegação Flutuante Centralizada (Floating Pill Navigation) */}
        <div ref={pillRef} className="flex items-center justify-center pointer-events-auto">
          <nav
            aria-label="Navegação principal"
            className={`inline-flex items-center p-1 md:p-1.5 lg:p-1.5 rounded-full border transition-all duration-300 ${
              isScrolled
                ? "bg-white/95 backdrop-blur-lg border-[#E2DDD5] shadow-[0_8px_28px_rgba(0,0,0,0.08)] lg:bg-black/45 lg:border-white/20 lg:shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
                : "bg-white/80 backdrop-blur-md border-[#E7E2DA]/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)] lg:bg-black/35 lg:backdrop-blur-md lg:border-white/20 lg:shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
            }`}
          >
            <a
              href="#inicio"
              onClick={(e) => scrollToSection(e, "inicio")}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                activeSection === "inicio"
                  ? "shadow-xs font-semibold text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
              }`}
              style={activeSection === "inicio" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
            >
              Início
            </a>
            <a
              href="#atendimentos"
              onClick={(e) => scrollToSection(e, "atendimentos")}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                activeSection === "atendimentos"
                  ? "shadow-xs font-semibold text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
              }`}
              style={activeSection === "atendimentos" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
            >
              Atendimentos
            </a>
            <a
              href="#sobre"
              onClick={(e) => scrollToSection(e, "sobre")}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                activeSection === "sobre"
                  ? "shadow-xs font-semibold text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
              }`}
              style={activeSection === "sobre" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
            >
              Sobre Mim
            </a>
            <a
              href="#diferenciais"
              onClick={(e) => scrollToSection(e, "diferenciais")}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                activeSection === "diferenciais"
                  ? "shadow-xs font-semibold text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
              }`}
              style={activeSection === "diferenciais" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
            >
              Diferenciais
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => scrollToSection(e, "como-funciona")}
              className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                activeSection === "como-funciona"
                  ? "shadow-xs font-semibold text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
              }`}
              style={activeSection === "como-funciona" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
            >
              Como Funciona
            </a>
            {shouldShowLocation && (
              <a
                href="#localizacao"
                onClick={(e) => scrollToSection(e, "localizacao")}
                className={`px-3 py-1.5 md:px-3.5 md:py-2 lg:px-4.5 lg:py-2 rounded-full font-heading font-medium text-xs md:text-sm lg:text-[16px] tracking-normal transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 ${
                  activeSection === "localizacao"
                    ? "shadow-xs font-semibold text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] lg:text-white/90 lg:hover:text-white lg:hover:bg-white/15"
                }`}
                style={activeSection === "localizacao" ? { backgroundColor: "var(--primary)", color: "#ffffff" } : undefined}
              >
                Localização
              </a>
            )}
          </nav>
        </div>

        {/* LADO DIREITO: Autenticação (Pill arredondado de Login ou Usuário) */}
        <div ref={authRef} className="flex items-center justify-end gap-2.5 shrink-0 pointer-events-auto">
          {isLoadingAuth ? (
            <div className="w-24 h-10 rounded-full bg-slate-100/80 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href={dashboardUrl}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 lg:px-4.5 lg:py-2 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 group text-xs md:text-sm lg:text-[15px] font-heading font-semibold ${
                  isScrolled
                    ? "bg-white/95 backdrop-blur-lg border-[#E2DDD5] text-slate-800 hover:text-[var(--primary)] hover:border-[var(--primary)]/50 shadow-[0_6px_20px_rgba(0,0,0,0.06)] lg:bg-black/45 lg:border-white/20 lg:text-white hover:lg:text-white"
                    : "bg-white/80 backdrop-blur-md border-[#E7E2DA]/90 text-slate-700 hover:text-[var(--primary)] hover:border-[var(--primary)]/40 shadow-[0_2px_12px_rgba(0,0,0,0.03)] lg:bg-black/35 lg:backdrop-blur-md lg:border-white/20 lg:text-white hover:lg:text-white"
                }`}
                aria-label={`Acessar painel (${user.name})`}
              >
                <UserCheck className="h-4 w-4 md:h-4.5 md:w-4.5 text-[var(--primary)] lg:text-white group-hover:scale-105 transition-transform shrink-0" />
                <span className="max-w-[110px] lg:max-w-[140px] truncate text-inherit">{user.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)] text-white px-2 py-0.5 rounded-full shrink-0">
                  {user.role === "ADMIN" ? "Admin" : "Paciente"}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair da conta"
                aria-label="Sair da conta"
                className={`p-1.5 md:p-2 lg:p-2 rounded-full border transition-all duration-200 cursor-pointer ${
                  isScrolled
                    ? "bg-white/95 backdrop-blur-lg border-[var(--primary)]/50 text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 lg:bg-black/45 lg:border-white/20 lg:text-white hover:lg:bg-white/15"
                    : "bg-white/80 backdrop-blur-md border-[var(--primary)]/40 text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 lg:bg-black/35 lg:border-white/20 lg:text-white hover:lg:bg-white/15"
                }`}
              >
                <LogOut className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <button
                type="button"
                className={`inline-flex items-center gap-2 px-4 py-1.5 md:px-4 md:py-2 lg:px-4.5 lg:py-2 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30 text-xs md:text-sm lg:text-[16px] font-heading font-semibold ${
                  isScrolled
                    ? "bg-white/95 backdrop-blur-lg border-[#E2DDD5] text-slate-800 hover:text-[var(--primary)] hover:border-[var(--primary)]/50 shadow-[0_6px_20px_rgba(0,0,0,0.06)] lg:bg-black/45 lg:border-white/20 lg:text-white hover:lg:bg-black/60"
                    : "bg-white/80 backdrop-blur-md border-[#E7E2DA]/90 text-slate-700 hover:text-[var(--primary)] hover:border-[var(--primary)]/40 shadow-[0_2px_12px_rgba(0,0,0,0.03)] lg:bg-black/35 lg:backdrop-blur-md lg:border-white/20 lg:text-white hover:lg:bg-black/50 hover:lg:border-white/35"
                }`}
              >
                <LogIn className="h-4 w-4 md:h-4.5 md:w-4.5 text-slate-500 lg:text-white" />
                <span className="lg:text-white">Login</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ================= 3. MENU MÓVEL EXPANSÍVEL (DRAWER OVERLAY) ================= */}
      {isMenuOpen && (
        <>
          {/* Fundo Escurecido com Fechamento ao Tocar (abaixo do header flutuante z-30) */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-30 md:hidden animate-backdrop-fade pointer-events-auto cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              document.body.style.overflow = "";
            }}
            aria-hidden="true"
          />

          {/* Painel de Navegação Móvel unificado imediatamente abaixo do header */}
          <div
            id="mobile-navigation-menu"
            className="fixed left-3 right-3 sm:left-4 sm:right-4 max-h-[calc(100vh-5.5rem)] bg-white rounded-b-2xl rounded-t-none border border-t-0 border-slate-200/90 shadow-2xl z-40 md:hidden animate-menu-drawer flex flex-col overflow-y-auto pointer-events-auto"
            style={{
              top: "calc(68px + env(safe-area-inset-top, 0px))",
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="px-5 py-5 space-y-4">
              {/* Lista de Seções com Animação em Blocos Sequenciais */}
              <div className="flex flex-col space-y-1.5">
                {mobileNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => handleMobileNavClick(e, item.id)}
                      className={`animate-block-stagger flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold shadow-xs"
                          : "text-slate-800 hover:bg-slate-100/80 active:bg-slate-200/70 hover:text-[var(--primary)]"
                      }`}
                      style={{ animationDelay: `${index * 55 + 40}ms` }}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-[var(--primary)]" />
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight className={`h-4 w-4 ${isActive ? "text-[var(--primary)]" : "text-slate-400"}`} />
                    </a>
                  );
                })}
              </div>

              {/* Divisor com fade */}
              <div
                className="pt-2 border-t border-slate-100 animate-block-stagger"
                style={{ animationDelay: `${mobileNavItems.length * 55 + 60}ms` }}
              />

              {/* Autenticação no Mobile (Bloco Sequencial Final) */}
              <div
                className="pt-1 pb-2 animate-block-stagger"
                style={{ animationDelay: `${mobileNavItems.length * 55 + 90}ms` }}
              >
                {isLoadingAuth ? (
                  <div className="w-full h-12 rounded-xl bg-slate-100 animate-pulse" />
                ) : user ? (
                  <div className="space-y-2">
                    <Link
                      href={dashboardUrl}
                      onClick={handleLinkClick}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold text-slate-800 bg-[var(--primary)]/8 hover:bg-[var(--primary)]/15 text-[var(--primary)] transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--primary)]/50 hover:border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/8 active:bg-[var(--primary)]/15 transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      <LogOut className="h-4 w-4 text-[var(--primary)]" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                ) : (
                  <Link href="/login" onClick={handleLinkClick} className="block w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full gap-2 text-sm font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl h-11 min-h-[44px] py-2.5 cursor-pointer shadow-xs"
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
