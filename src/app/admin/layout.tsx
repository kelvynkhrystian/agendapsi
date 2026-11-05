"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Painel Geral", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda & Calendário", icon: Calendar },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
  { href: "/admin/servicos", label: "Serviços & Políticas", icon: Briefcase },
  { href: "/admin/pacotes", label: "Pacotes de Sessões", icon: Boxes },
  { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/admin/minisite", label: "MiniSite & Páginas", icon: Globe },
  { href: "/admin/lembretes", label: "Lembretes", icon: BellRing },
  { href: "/admin/integracoes", label: "Integrações", icon: Share2 },
  { href: "/admin/arquivos", label: "Armazenamento & Backup", icon: HardDrive },
  { href: "/admin/configuracoes", label: "Configurações Gerais", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] dark:bg-[#080809] text-[#111827] dark:text-[#F5F5F5] selection:bg-[var(--primary)] selection:text-white">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#101012] flex flex-col transition-transform duration-200 md:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-[#E2E4E8] dark:border-[#303034] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-[var(--primary)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">PSI Admin</span>
              <span className="text-[10px] text-[#6B7280] dark:text-[#A3A3AD] font-medium">Gestão de Consultório</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-[#6B7280] hover:bg-slate-100 dark:hover:bg-[#222226] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs border border-[var(--primary)]/20"
                    : "text-[#4B5563] dark:text-[#C7C7CC] hover:bg-[#F3F4F6] dark:hover:bg-[#19191C] hover:text-[#111827] dark:hover:text-[#F5F5F5]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--primary)]" : "text-[#9CA3AF] dark:text-[#A3A3AD]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E2E4E8] dark:border-[#303034]">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <header className="h-16 border-b border-[#E2E4E8] dark:border-[#303034] bg-white/90 dark:bg-[#101012]/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#4B5563] dark:text-[#C7C7CC] hover:bg-slate-100 dark:hover:bg-[#222226] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#6B7280] dark:text-[#A3A3AD]">
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                {navItems.find((n) => n.href === pathname)?.label || "Módulo"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl border-[#E2E4E8] dark:border-[#303034] text-[#111827] dark:text-[#F5F5F5] hover:bg-[#F3F4F6] dark:hover:bg-[#222226]">
                <Globe className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>Ver MiniSite</span>
              </Button>
            </Link>
            <ThemeToggle />
            <NotificationBell role="ADMIN" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
