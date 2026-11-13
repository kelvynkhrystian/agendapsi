"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGroup, MotionConfig, motion } from "motion/react";
import { cn, formatBRL } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  Boxes,
  DollarSign,
  Globe,
  HardDrive,
  Settings,
  LogOut,
  Menu,
  X,
  Stethoscope,
  ChevronRight,
  BellRing,
  Share2,
  FileText,
  ClipboardList,
  Plus,
} from "pulsoicon-react";

interface NavGroup {
  groupLabel: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Atendimento",
    items: [
      { href: "/admin", label: "Painel Geral", icon: LayoutDashboard },
      { href: "/admin/agenda", label: "Agenda", icon: Calendar },
      { href: "/admin/pacientes", label: "Pacientes", icon: Users },
      { href: "/admin/documentos", label: "Documentos", icon: FileText },
      { href: "/admin/formularios", label: "Formulários", icon: ClipboardList },
    ],
  },
  {
    groupLabel: "Gestão & Receita",
    items: [
      { href: "/admin/servicos", label: "Serviços", icon: Briefcase },
      { href: "/admin/pacotes", label: "Pacotes", icon: Boxes },
      { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
    ],
  },
  {
    groupLabel: "Site & Sistema",
    items: [
      { href: "/admin/minisite", label: "Site", icon: Globe },
      { href: "/admin/paginas-informativas", label: "Páginas Info", icon: FileText },
      { href: "/admin/lembretes", label: "Lembretes", icon: BellRing },
      { href: "/admin/integracoes", label: "Integrações", icon: Share2 },
      { href: "/admin/arquivos", label: "Backup", icon: HardDrive },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

const allNavItems = navGroups.flatMap((g) => g.items);

function getAdminBreadcrumbLabel(pathname: string): string {
  if (pathname.startsWith("/admin/notificacoes")) return "Notificações";
  if (pathname.startsWith("/admin/lembretes/registros")) return "Registros de Lembretes";
  if (pathname.startsWith("/admin/pacientes/")) return "Detalhes do Paciente";
  if (pathname.startsWith("/admin/formularios")) return "Formulários";
  if (pathname.startsWith("/admin/prontuarios")) return "Prontuários";

  const direct = allNavItems.find((n) => n.href === pathname);
  if (direct) return direct.label;

  const parent = allNavItems
    .filter((n) => n.href !== "/admin")
    .find((n) => pathname.startsWith(n.href));
  if (parent) return parent.label;

  return "Painel Geral";
}

function getInitials(name: string): string {
  const parts = (name || "PSI").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMeta, setAdminMeta] = useState<{
    name: string;
    todayCount: number;
    todayCompletionPct: number;
    monthRealCents: number;
    timezone: string;
  }>({
    name: "Profissional",
    todayCount: 0,
    todayCompletionPct: 0,
    monthRealCents: 0,
    timezone: "America/Sao_Paulo",
  });

  useEffect(() => {
    let active = true;
    fetch("/api/admin/dashboard-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d || d.error) return;
        setAdminMeta({
          name: d.adminDisplayName || "Profissional",
          todayCount: d.todayAppointments?.length ?? 0,
          todayCompletionPct: d.analytics?.todaySummary?.completionRatePct ?? 0,
          monthRealCents: d.revenueMonth?.realCents ?? 0,
          timezone: d.timezone || "America/Sao_Paulo",
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  let formattedTodayHeader = "";
  try {
    formattedTodayHeader = new Intl.DateTimeFormat("pt-BR", {
      timeZone: adminMeta.timezone,
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(new Date());
  } catch {
    formattedTodayHeader = "";
  }

  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (Math.min(100, Math.max(0, adminMeta.todayCompletionPct)) / 100) * ringCircumference;

  const breadcrumbLabel = getAdminBreadcrumbLabel(pathname);
  const activeNavHref =
    allNavItems
      .filter((item) =>
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname === item.href || pathname.startsWith(item.href)
      )
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex bg-[#F8F8F8] dark:bg-[#0C0C0C] text-[#171717] dark:text-[#F5F5F5] selection:bg-[var(--primary)] selection:text-white">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E5E5E5] dark:border-[#242424] bg-white dark:bg-[#141414] flex flex-col transition-transform duration-200 lg:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#E5E5E5] dark:border-[#242424] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div
              className="h-9 w-9 rounded-xl text-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, var(--button-bg, #CA4C0A) 0%, var(--primary, #EA580C) 100%)",
              }}
            >
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">
                PSI Admin
              </span>
              <span className="text-[10px] text-[#737373] dark:text-[#8C8C8C] font-medium">
                Gestão de Consultório
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#C0C0C0] dark:hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Atalho Rápido de Abertura (+ Novo) inspirado no painel de referência */}
        <div className="px-3.5 pt-3.5 pb-1">
          <Link href="/admin/agenda" onClick={() => setSidebarOpen(false)}>
            <div className="w-full h-9 px-3 rounded-xl bg-white border border-[var(--primary)]/25 text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1B1B1B] dark:border-[#2C2C2C] dark:text-[#F5F5F5] dark:hover:bg-[#242424] flex items-center justify-between text-xs font-heading font-semibold transition-all shadow-2xs cursor-pointer">
              <span className="flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-current" />
                <span>Novo Agendamento</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </div>
          </Link>
        </div>

        {/* Grouped Navigation */}
        <LayoutGroup id="admin-sidebar-nav">
          <motion.nav
            layoutScroll
            className="relative isolate flex-1 px-3 py-2 space-y-2.5 overflow-y-auto overflow-x-hidden"
          >
            {navGroups.map((group) => (
              <div key={group.groupLabel} className="space-y-0.5">
                <p className="px-3 pb-0.5 text-[10px] font-heading font-bold uppercase tracking-wider text-[#737373] dark:text-[#737373]">
                  {group.groupLabel}
                </p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === activeNavHref;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group/nav relative flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-heading font-medium transition-[color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                        isActive
                          ? "text-[var(--button-fg,#ffffff)] font-semibold"
                          : "text-[#525252] dark:text-[#B8B8B8] hover:bg-[#F4F4F5] dark:hover:bg-[#1E1E1E] hover:text-[#171717] dark:hover:text-[#FFFFFF] active:scale-[0.99]"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="admin-sidebar-active-pill"
                          aria-hidden="true"
                          transition={{
                            type: "spring",
                            stiffness: 440,
                            damping: 36,
                            mass: 0.85,
                          }}
                          className="pointer-events-none absolute inset-0 z-0 rounded-xl bg-[var(--button-bg,var(--primary))] dark:bg-[var(--button-bg,var(--primary))] shadow-sm dark:shadow-[0_8px_22px_-6px_rgba(234,88,12,0.5)]"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--button-bg, #CA4C0A) 0%, var(--primary, #EA580C) 100%)",
                          }}
                        />
                      )}
                      <span
                        className={cn(
                          "relative z-10 flex items-center justify-center shrink-0 transition-transform duration-200",
                          !isActive && "group-hover/nav:translate-x-0.5"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors duration-200",
                            isActive
                              ? "text-white"
                              : "text-[#737373] dark:text-[#8C8C8C] group-hover/nav:text-[#171717] dark:group-hover/nav:text-[#F5F5F5]"
                          )}
                        />
                      </span>
                      <span className="relative z-10 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </motion.nav>
        </LayoutGroup>

        {/* Bottom Compact Summary + Logout */}
        <div className="p-3.5 border-t border-[#E5E5E5] dark:border-[#242424] space-y-2.5">
          <div className="p-3 rounded-xl bg-[#F8F8F8] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0">
              <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="3.5"
                  className="stroke-[#E5E5E5] dark:stroke-[#2C2C2C]"
                />
                <circle
                  cx="18"
                  cy="18"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="3.5"
                  stroke="var(--primary, #EA580C)"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-[#171717] dark:text-[#F5F5F5]">
                {adminMeta.todayCompletionPct}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-[#737373] dark:text-[#8C8C8C]">
                Hoje no consultório
              </p>
              <p className="font-heading text-xs font-bold text-[#171717] dark:text-[#F5F5F5] tabular-nums truncate">
                {formatBRL(adminMeta.monthRealCents)}/mês
              </p>
              <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6] tabular-nums">
                {adminMeta.todayCount} {adminMeta.todayCount === 1 ? "sessão hoje" : "sessões hoje"}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start bg-white border border-red-200/80 text-red-600 hover:bg-red-50 hover:border-red-300 dark:bg-transparent dark:border-transparent dark:text-[#F87171] dark:hover:bg-[#2A1818] gap-2 rounded-xl h-9"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 text-current" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        <header className="h-16 border-b border-[#E5E5E5] dark:border-[#242424] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#D0D0D0] dark:hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#737373] dark:text-[#8C8C8C] min-w-0 truncate">
              <span className="hidden sm:inline shrink-0">Admin</span>
              <ChevronRight className="hidden sm:block h-3.5 w-3.5 shrink-0 text-[#737373] dark:text-[#525252]" />
              <span
                key={breadcrumbLabel}
                className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] truncate animate-admin-crumb"
              >
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {formattedTodayHeader && (
              <div className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F8F8F8] dark:bg-[#1B1B1B] border border-[#E5E5E5] dark:border-[#2C2C2C] text-xs font-medium text-[#525252] dark:text-[#CCCCCC]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                <span className="capitalize">{formattedTodayHeader}</span>
              </div>
            )}

            <Link href="/" target="_blank" title="Abrir Site público em nova aba" aria-label="Abrir Site público em nova aba">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl">
                <Globe className="h-3.5 w-3.5 text-current" />
                <span>Ver Site</span>
              </Button>
            </Link>
            <ThemeToggle />
            <NotificationBell role="ADMIN" />

            <Link
              href="/admin/configuracoes"
              className="hidden md:flex items-center gap-2.5 pl-2 ml-0.5 border-l border-[#E5E5E5] dark:border-[#2C2C2C] hover:opacity-85 transition-opacity"
              title="Configurações do perfil"
            >
              <div
                className="h-8 w-8 rounded-full text-white flex items-center justify-center font-heading font-bold text-xs shrink-0 shadow-2xs"
                style={{
                  background:
                    "linear-gradient(135deg, var(--button-bg, #CA4C0A) 0%, var(--primary, #EA580C) 100%)",
                }}
              >
                {getInitials(adminMeta.name)}
              </div>
              <div className="hidden xl:flex flex-col leading-tight text-left">
                <span className="text-xs font-heading font-semibold text-[#171717] dark:text-[#F5F5F5] max-w-[130px] truncate">
                  {adminMeta.name}
                </span>
                <span className="text-[10px] text-[#737373] dark:text-[#8C8C8C]">
                  Titular Admin
                </span>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div key={pathname} className={cn("w-full", pathname !== "/admin" && "admin-page-stage")}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </MotionConfig>
  );
}
