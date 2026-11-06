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
  FileText,
} from "lucide-react";

const navItems = [
  { href: "/admin", label: "Painel Geral", icon: LayoutDashboard },
  { href: "/admin/agenda", label: "Agenda", icon: Calendar },
  { href: "/admin/pacientes", label: "Pacientes", icon: Users },
  { href: "/admin/servicos", label: "Serviços", icon: Briefcase },
  { href: "/admin/pacotes", label: "Pacotes", icon: Boxes },
  { href: "/admin/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/admin/minisite", label: "MiniSite", icon: Globe },
  { href: "/admin/paginas-informativas", label: "Páginas Info", icon: FileText },
  { href: "/admin/lembretes", label: "Lembretes", icon: BellRing },
  { href: "/admin/integracoes", label: "Integrações", icon: Share2 },
  { href: "/admin/arquivos", label: "Backup", icon: HardDrive },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

function getAdminBreadcrumbLabel(pathname: string): string {
  if (pathname.startsWith("/admin/notificacoes")) return "Notificações";
  if (pathname.startsWith("/admin/lembretes/registros")) return "Registros de Lembretes";
  if (pathname.startsWith("/admin/pacientes/")) return "Detalhes do Paciente";
  if (pathname.startsWith("/admin/prontuarios")) return "Prontuários";

  const direct = navItems.find((n) => n.href === pathname);
  if (direct) return direct.label;

  const parent = navItems
    .filter((n) => n.href !== "/admin")
    .find((n) => pathname.startsWith(n.href));
  if (parent) return parent.label;

  return "Painel Geral";
}

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
    <div className="min-h-screen flex bg-[#F8F8F8] dark:bg-[#0C0C0C] text-[#171717] dark:text-[#F5F5F5] selection:bg-[var(--primary)] selection:text-white">
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
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E5E5E5] dark:border-[#393939] bg-white dark:bg-[#141414] flex flex-col transition-transform duration-200 md:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 px-6 border-b border-[#E5E5E5] dark:border-[#393939] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 font-bold text-[var(--primary)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 dark:bg-[#202020] text-[var(--primary)] dark:text-[#F5F5F5] dark:border dark:border-[#393939] flex items-center justify-center shadow-xs">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">PSI Admin</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6] font-medium">Gestão de Consultório</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl text-[#737373] hover:bg-slate-100 dark:hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#525252] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
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
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] dark:focus-visible:ring-[#525252]",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs border border-[var(--primary)]/20 dark:bg-[#292929] dark:text-[#FFFFFF] dark:border-[#393939]"
                    : "text-[#525252] dark:text-[#D0D0D0] hover:bg-[#F2F2F2] dark:hover:bg-[#202020] hover:text-[#171717] dark:hover:text-[#FFFFFF]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--primary)] dark:text-[#FFFFFF]" : "text-[#737373] dark:text-[#C0C0C0]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E5E5] dark:border-[#393939]">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-red-600 dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-[#321E1E] gap-2 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair do Sistema</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        <header className="h-16 border-b border-[#E5E5E5] dark:border-[#393939] bg-white/90 dark:bg-[#141414]/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-[#525252] dark:text-[#D0D0D0] hover:bg-slate-100 dark:hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#525252] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#737373] dark:text-[#A6A6A6]">
              <span>Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#737373] dark:text-[#737373]" />
              <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {getAdminBreadcrumbLabel(pathname)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl border-[#E5E5E5] dark:border-[#393939] text-[#171717] dark:text-[#F5F5F5] hover:bg-[#F2F2F2] dark:hover:bg-[#202020]">
                <Globe className="h-3.5 w-3.5 text-[var(--primary)] dark:text-[#C0C0C0]" />
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
