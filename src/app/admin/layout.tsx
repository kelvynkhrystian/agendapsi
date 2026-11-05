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
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-[#F5F5F5] selection:bg-[var(--primary)] selection:text-white">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-200/80 dark:border-[#333333] bg-white dark:bg-[#191919] flex flex-col transition-transform duration-200 md:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-slate-200/80 dark:border-[#333333] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-[var(--primary)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-[#F5F5F5]">PSI Admin</span>
              <span className="text-[10px] text-slate-400 font-medium">Gestão de Consultório</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2D2D2D] transition-colors"
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
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold shadow-xs border border-[var(--primary)]/15"
                    : "text-slate-600 dark:text-[#BDBDBD] hover:bg-slate-100/80 dark:hover:bg-[#262626] hover:text-slate-900 dark:hover:text-[#F5F5F5]"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-[var(--primary)]" : "text-slate-400 dark:text-[#888888]")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/80 dark:border-[#333333]">
          <Button
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
        <header className="h-16 border-b border-slate-200/80 dark:border-[#333333] bg-white/80 dark:bg-[#191919]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-[#BDBDBD] hover:bg-slate-100 dark:hover:bg-[#2D2D2D] transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 dark:text-[#9E9E9E]">
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-[#777777]" />
              <span className="font-bold text-slate-900 dark:text-[#F5F5F5]">
                {navItems.find((n) => n.href === pathname)?.label || "Módulo"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl border-slate-200 dark:border-[#444444] text-slate-700 dark:text-[#E0E0E0] hover:bg-slate-100 dark:hover:bg-[#353535]">
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
