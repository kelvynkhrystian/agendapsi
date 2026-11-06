"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import {
  LayoutDashboard,
  Calendar,
  Boxes,
  FolderLock,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  HeartHandshake,
  MessageCircle,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

const patientNavItems = [
  { href: "/paciente", label: "Painel & Consultas", icon: LayoutDashboard },
  { href: "/paciente/financeiro", label: "Meus Pacotes & Faturas", icon: Boxes },
  { href: "/paciente/documentos", label: "Documentos Liberados", icon: FolderLock },
  { href: "/paciente/anamnese", label: "Ficha de Anamnese", icon: FileText },
  { href: "/paciente/notificacoes", label: "Notificações", icon: Bell },
  { href: "/paciente/perfil", label: "Meu Perfil", icon: User },
];

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientName, setPatientName] = useState("Paciente");
  const [supportUrl, setSupportUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setPatientName(d.user.name || d.user.fullName || "Paciente");
        }
      })
      .catch(() => {});

    fetch("/api/patient/support")
      .then((r) => r.json())
      .then((d) => {
        if (d.supportUrl) {
          setSupportUrl(d.supportUrl);
        }
      })
      .catch(() => {});
  }, []);

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
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E2E4E8] dark:border-[#303034] bg-white dark:bg-[#101012] flex flex-col transition-transform duration-200 md:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-[#E2E4E8] dark:border-[#303034] flex items-center justify-between">
          <Link href="/paciente" className="flex items-center gap-2.5 font-bold text-[var(--primary)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shadow-xs">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-[#111827] dark:text-[#F5F5F5]">Área do Paciente</span>
              <span className="text-[10px] text-[#6B7280] dark:text-[#A3A3AD] font-medium">Portal de Saúde</span>
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

        {/* Patient Profile Card Snippet */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-[#F3F4F6] dark:bg-[#19191C] border border-[#E2E4E8] dark:border-[#303034]">
          <p className="text-[10px] text-[#6B7280] dark:text-[#A3A3AD] uppercase tracking-wider font-semibold">Conectado como</p>
          <p className="font-heading text-xs font-semibold text-[#111827] dark:text-[#F5F5F5] truncate mt-0.5">{patientName}</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {patientNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/paciente" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isActive
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-bold shadow-xs border border-[var(--primary)]/20"
                    : "text-[#4B5563] dark:text-[#C7C7CC] hover:bg-[#F3F4F6] dark:hover:bg-[#19191C] hover:text-[#111827] dark:hover:text-[#F5F5F5]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-[var(--primary)]" : "text-[#9CA3AF] dark:text-[#A3A3AD]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Ação de Suporte via WhatsApp */}
          {supportUrl && (
            <div className="pt-2 mt-2 border-t border-[#E2E4E8] dark:border-[#303034]">
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group"
                aria-label="Abrir suporte pelo WhatsApp"
              >
                <WhatsAppIcon className="h-4.5 w-4.5 shrink-0 group-hover:scale-105 transition-transform" variant="original" />
                <span className="truncate">Suporte</span>
              </a>
            </div>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-[#E2E4E8] dark:border-[#303034]">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Sair da Conta</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area positioned on the right */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Header */}
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
              <span>Paciente</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#71717A]" />
              <span className="font-heading font-semibold text-[#111827] dark:text-[#F5F5F5]">
                {patientNavItems.find((n) => n.href === pathname)?.label ||
                  (pathname.startsWith("/paciente/notificacoes") ? "Notificações" : "Painel")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/agendar">
              <Button size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl bg-[var(--button-bg,var(--primary))] hover:brightness-105 text-[var(--button-fg,var(--primary-foreground,#ffffff))] shadow-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Agendar Consulta</span>
              </Button>
            </Link>
            <ThemeToggle />
            <NotificationBell role="PATIENT" />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
