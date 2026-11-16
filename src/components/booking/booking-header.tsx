"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Menu,
  X,
  LogIn,
  LogOut,
  LayoutDashboard,
  Home,
  Heart,
  HelpCircle,
  MapPin,
  ChevronRight,
} from "pulsoicon-react";
import { extractFirstName, getUserInitials } from "@/lib/header-profile";

export interface BookingHeaderUser {
  name: string;
  role: "ADMIN" | "PATIENT";
}

export interface BookingHeaderProps {
  onBack?: () => void;
  logoHorizontalUrl?: string | null;
  logoUrl?: string | null;
  clinicName?: string;
  professionalName?: string;
  crpCrm?: string | null;
  shouldShowLocation?: boolean;
  visibleSections?: {
    atendimentos?: boolean;
    diferenciais?: boolean;
    comoFunciona?: boolean;
  };
  currentUser?: BookingHeaderUser | null;
  homeUrl?: string;
  className?: string;
}

export function BookingHeader({
  onBack,
  logoHorizontalUrl,
  logoUrl,
  clinicName = "Consultório de Psicologia",
  professionalName,
  shouldShowLocation = false,
  visibleSections,
  currentUser = null,
  homeUrl = "/",
  className = "",
}: BookingHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<BookingHeaderUser | null>(currentUser);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Nome neutro que nunca exibe marcação de fallback "PSI"
  const neutralFallbackName =
    clinicName && clinicName !== "PSI"
      ? clinicName
      : professionalName || "Consultório de Psicologia";

  // Sincroniza sessão silenciosamente no cliente
  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data?.user && (data.role === "ADMIN" || data.role === "PATIENT")) {
          const savedName = data.user.name ?? data.user.fullName;
          setUser({
            name: typeof savedName === "string" ? savedName : "",
            role: data.role,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Fecha menu móvel ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMenuOpen]);

  // Fecha menu ao pressionar Escape
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

  // Trava scroll do body quando o menu móvel está aberto
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

  const handleMobileNavClick = (id: string) => {
    setIsMenuOpen(false);
    document.body.style.overflow = "";
    window.location.href = `/#${id}`;
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setIsMenuOpen(false);
      document.body.style.overflow = "";
      window.location.href = "/";
    }
  };

  const hasDashboardAccess = user?.role === "ADMIN" || user?.role === "PATIENT";
  const firstName = user ? extractFirstName(user.name) : "";
  const initials = user ? getUserInitials(user.name) : "";
  const dashboardUrl = user?.role === "ADMIN" ? "/admin" : "/paciente";

  const mobileNavItems = [
    { id: "inicio", label: "Início", icon: Home },
    { id: "sobre", label: "Sobre Mim", icon: Heart },
    ...(visibleSections?.comoFunciona !== false ? [{ id: "como-funciona", label: "Como Funciona", icon: HelpCircle }] : []),
    ...(shouldShowLocation ? [{ id: "localizacao", label: "Localização", icon: MapPin }] : []),
  ];

  return (
    <header
      data-testid="booking-header"
      className={`fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-slate-200/80 shadow-xs ${className}`}
    >
      {/* ================= 1. CABEÇALHO MOBILE (< 768px): [ Seta Voltar ] — [ Logo Centralizada ] — [ Menu Hamburguer ] ================= */}
      <div className="flex md:hidden w-full items-center justify-between px-3 sm:px-4 py-2 min-h-[54px] bg-white relative z-50">
        {/* LADO ESQUERDO: Botão Voltar */}
        <div className="flex items-center shrink-0 w-10">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200/90 bg-white shadow-xs flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 text-current" />
            </button>
          ) : (
            <Link
              href={homeUrl}
              aria-label="Voltar ao início"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200/90 bg-white shadow-xs flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 text-current" />
            </Link>
          )}
        </div>

        {/* CENTRO: Logo no tamanho mobile oficial, perfeitamente centralizada */}
        <div className="flex-1 flex items-center justify-center px-1 min-w-0">
          <Link
            href={homeUrl}
            onClick={handleLinkClick}
            className="flex items-center justify-center shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 cursor-pointer"
            aria-label="Página inicial"
          >
            {logoHorizontalUrl ? (
              <img
                src={logoHorizontalUrl}
                alt={neutralFallbackName}
                className="h-[21px] sm:h-6 w-auto max-w-[128px] sm:max-w-[158px] object-contain transition-transform active:scale-98"
              />
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt={neutralFallbackName}
                className="h-[21px] sm:h-6 w-auto max-w-[98px] object-contain rounded-sm"
              />
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <div className="w-6 h-6 rounded bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-serif font-black text-[15px] shrink-0">
                  Ψ
                </div>
                <span className="text-[13px] sm:text-[14px] font-semibold tracking-tight text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                  {neutralFallbackName}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* LADO DIREITO: Botão Menu Hambúrguer */}
        <div className="flex items-center justify-end shrink-0 w-10">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            aria-expanded={isMenuOpen}
            aria-controls="booking-mobile-menu"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-200/90 bg-white shadow-xs flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer"
          >
            {isMenuOpen ? <X className="h-5 w-5 text-current" /> : <Menu className="h-5 w-5 text-current" />}
          </button>
        </div>
      </div>

      {/* ================= 2. CABEÇALHO DESKTOP (>= 768px): BRANCO SÓLIDO, CONTORNO LARANJA E LETRAS LARANJAS ================= */}
      <div className="hidden md:block w-full bg-white py-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full max-w-6xl xl:max-w-7xl mx-auto px-4 lg:px-6">
          {/* LADO ESQUERDO: Botão Voltar + Logo Menor (Tamanho Mobile) */}
          <div className="flex items-center justify-start gap-3 min-w-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 border border-[var(--primary)] bg-white shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-current" />
              </button>
            ) : (
              <Link
                href={homeUrl}
                aria-label="Voltar ao início"
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 border border-[var(--primary)] bg-white shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 cursor-pointer shrink-0"
              >
                <ArrowLeft className="h-5 w-5 text-current" />
              </Link>
            )}

            <Link
              href={homeUrl}
              className="flex items-center gap-2 group shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 cursor-pointer"
              aria-label="Voltar ao início"
            >
              {logoHorizontalUrl ? (
                <img
                  src={logoHorizontalUrl}
                  alt={neutralFallbackName}
                  className="h-6 w-auto max-w-[130px] md:max-w-[150px] object-contain transition-transform group-hover:scale-[1.02]"
                />
              ) : logoUrl ? (
                <img
                  src={logoUrl}
                  alt={neutralFallbackName}
                  className="h-6 w-auto max-w-[90px] md:max-w-[110px] object-contain rounded-sm"
                />
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-serif font-black text-xs shrink-0">
                    Ψ
                  </div>
                  <span className="text-xs md:text-sm font-semibold tracking-tight text-slate-900 truncate max-w-[140px] md:max-w-[170px]">
                    {neutralFallbackName}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* CENTRO: Pílula de Navegação Central — Fundo Branco Sólido, Contorno Laranja e Letras Laranjas */}
          <div className="flex items-center justify-center">
            <nav
              aria-label="Navegação rápida"
              className="h-[44px] rounded-full border border-[var(--primary)] bg-white shadow-xs px-2 py-1 inline-flex items-center gap-1 select-none"
            >
              <Link
                href="/#inicio"
                className="h-full inline-flex items-center px-4 py-1.5 rounded-full font-heading font-semibold text-xs md:text-sm leading-5 tracking-normal whitespace-nowrap text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              >
                Início
              </Link>
              <Link
                href="/#sobre"
                className="h-full inline-flex items-center px-4 py-1.5 rounded-full font-heading font-semibold text-xs md:text-sm leading-5 tracking-normal whitespace-nowrap text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              >
                Sobre Mim
              </Link>
              {visibleSections?.comoFunciona !== false && (
                <Link
                  href="/#como-funciona"
                  className="h-full inline-flex items-center px-4 py-1.5 rounded-full font-heading font-semibold text-xs md:text-sm leading-5 tracking-normal whitespace-nowrap text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                >
                  Como Funciona
                </Link>
              )}
              {shouldShowLocation && (
                <Link
                  href="/#localizacao"
                  className="h-full inline-flex items-center px-4 py-1.5 rounded-full font-heading font-semibold text-xs md:text-sm leading-5 tracking-normal whitespace-nowrap text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                >
                  Localização
                </Link>
              )}
            </nav>
          </div>

          {/* LADO DIREITO: Botão de Login / Perfil — Fundo Branco Sólido, Contorno Laranja e Letras Laranjas */}
          <div className="flex items-center justify-end gap-2.5 shrink-0">
            {user ? (
              <div
                data-testid="booking-profile-pill"
                className="h-[44px] rounded-full border border-[var(--primary)] bg-white shadow-xs px-2.5 py-1 inline-flex items-center justify-center gap-2"
              >
                {hasDashboardAccess ? (
                  <Link
                    href={dashboardUrl}
                    title="Acessar painel"
                    aria-label="Acessar painel"
                    className="w-7 h-7 rounded-full bg-[var(--primary)] text-white inline-flex items-center justify-center font-heading font-bold text-xs tracking-tight shrink-0 shadow-xs select-none hover:brightness-110 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 cursor-pointer"
                  >
                    <span aria-hidden="true">{initials}</span>
                  </Link>
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-7 h-7 rounded-full bg-[var(--primary)] text-white inline-flex items-center justify-center font-heading font-bold text-xs tracking-tight shrink-0 shadow-xs select-none"
                  >
                    {initials}
                  </span>
                )}

                <span className="w-px h-4 shrink-0 bg-[var(--primary)]/30" aria-hidden="true" />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  title="Sair da conta"
                  aria-label="Sair da conta"
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/10 active:bg-[var(--primary)]/20 disabled:opacity-60 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/50 shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5 text-current" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                data-testid="booking-login-pill"
                className="h-[44px] rounded-full border border-[var(--primary)] bg-white shadow-xs px-4 inline-flex items-center justify-center gap-2 font-heading font-semibold text-xs md:text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              >
                <LogIn className="h-4 w-4 shrink-0 text-current" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ================= 3. MENU MÓVEL EXPANSÍVEL (DRAWER OVERLAY) ================= */}
      {isMenuOpen && (
        <>
          {/* Fundo Escurecido com Fechamento ao Tocar */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs z-30 md:hidden animate-backdrop-fade pointer-events-auto cursor-pointer"
            onClick={() => {
              setIsMenuOpen(false);
              document.body.style.overflow = "";
            }}
            aria-hidden="true"
          />

          {/* Painel de Navegação Móvel imediatamente abaixo do header */}
          <div
            id="booking-mobile-menu"
            className="fixed left-3 right-3 sm:left-4 sm:right-4 max-h-[calc(100vh-5.5rem)] bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-40 md:hidden animate-menu-drawer flex flex-col overflow-y-auto pointer-events-auto"
            style={{
              top: "calc(60px + env(safe-area-inset-top, 0px))",
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="px-5 py-5 space-y-4">
              {/* Lista de Seções */}
              <div className="flex flex-col space-y-1.5">
                {mobileNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMobileNavClick(item.id)}
                      className="flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-[var(--primary)]/8 active:bg-[var(--primary)]/15 hover:text-[var(--primary)] transition-colors cursor-pointer text-left w-full"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-[var(--primary)]" />
                        <span>{item.label}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>

              {/* Divisor */}
              <div className="pt-2 border-t border-slate-100" />

              {/* Autenticação no Mobile */}
              <div className="pt-1 pb-2">
                {user ? (
                  <div className="space-y-2">
                    {hasDashboardAccess ? (
                      <Link
                        href={dashboardUrl}
                        onClick={handleLinkClick}
                        title="Acessar painel"
                        aria-label={`Acessar painel (${firstName})`}
                        className="group flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 rounded-xl text-sm font-bold text-slate-800 bg-[var(--primary)]/8 hover:bg-[var(--primary)]/15 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <span
                            aria-hidden="true"
                            className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-heading font-bold text-xs shrink-0"
                          >
                            {initials}
                          </span>
                          <span className="truncate text-slate-900">{firstName}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)] text-white font-heading font-semibold text-xs leading-none tracking-[0.02em] shrink-0 whitespace-nowrap shadow-xs group-hover:brightness-110 transition-[filter]">
                          <LayoutDashboard className="h-3 w-3 text-white shrink-0" aria-hidden="true" />
                          <span>Painel</span>
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-3 rounded-xl text-sm font-bold text-slate-800 bg-[var(--primary)]/8">
                        <span
                          aria-hidden="true"
                          className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-heading font-bold text-xs shrink-0"
                        >
                          {initials}
                        </span>
                        <span className="truncate text-slate-900">{firstName}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      aria-label="Sair da conta"
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-[var(--primary)]/50 hover:border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/8 active:bg-[var(--primary)]/15 disabled:opacity-60 transition-all duration-200 cursor-pointer shadow-xs"
                    >
                      <LogOut className="h-4 w-4 text-[var(--primary)]" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                ) : (
                  <Link href="/login" onClick={handleLinkClick} className="block w-full">
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl border border-[var(--primary)]/60 text-[var(--primary)] bg-white hover:bg-[var(--primary)]/10 font-heading font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <LogIn className="h-4 w-4 text-current" />
                      <span>Login</span>
                    </button>
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
