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
} from "pulsoicon-react";
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
    <div className="min-h-screen flex bg-[#F8F8F8] dark:bg-[#0C0C0C] text-[#171717] dark:text-[#F5F5F5] selection:bg-[var(--primary)] selection:text-white">
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
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#E5E5E5] dark:border-[#2C2C2C] bg-white dark:bg-[#141414] flex flex-col transition-transform duration-200 md:translate-x-0 shadow-xs",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-[#E5E5E5] dark:border-[#2C2C2C] flex items-center justify-between">
          <Link href="/paciente" className="flex items-center gap-2.5 font-bold text-[var(--primary)]">
            <div className="h-9 w-9 rounded-xl bg-[var(--button-bg,var(--primary))] text-white flex items-center justify-center shadow-xs">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-sm font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">Área do Paciente</span>
              <span className="text-[10px] text-[#737373] dark:text-[#A6A6A6] font-medium">Portal de Saúde</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-xl bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#C0C0C0] dark:hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Fechar menu"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Patient Profile Card Snippet */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-[#F4F4F5] dark:bg-[#202020] border border-[#E5E5E5] dark:border-[#2C2C2C]">
          <p className="text-[10px] text-[#737373] dark:text-[#A6A6A6] uppercase tracking-wider font-semibold">Conectado como</p>
          <p className="font-heading text-xs font-semibold text-[#171717] dark:text-[#F5F5F5] truncate mt-0.5">{patientName}</p>
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
                    ? "bg-[var(--button-bg,var(--primary))] dark:bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-sm dark:shadow-[0_8px_22px_-6px_rgba(234,88,12,0.5)]"
                    : "text-[#525252] dark:text-[#C0C0C0] hover:bg-[#F2F2F2] dark:hover:bg-[#202020] hover:text-[#171717] dark:hover:text-[#FFFFFF]"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-[#737373] dark:text-[#A6A6A6]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Ação de Suporte via WhatsApp */}
          {supportUrl && (
            <div className="pt-2 mt-2 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-heading font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-[#202020] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] group"
                aria-label="Abrir suporte pelo WhatsApp"
              >
                <WhatsAppIcon className="h-4.5 w-4.5 shrink-0 group-hover:scale-105 transition-transform" variant="original" />
                <span className="truncate">Suporte</span>
              </a>
            </div>
          )}
        </nav>

        {/* Logout Button */}
        <div className="p-3.5 border-t border-[#E5E5E5] dark:border-[#2C2C2C]">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start bg-white border border-red-200/80 text-red-600 hover:bg-red-50 hover:border-red-300 dark:bg-transparent dark:border-transparent dark:text-[#F87171] dark:hover:bg-[#321E1E] gap-2 rounded-xl text-xs h-9"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 text-current" />
            <span>Sair da Conta</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area positioned on the right */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-[#E5E5E5] dark:border-[#2C2C2C] bg-white/90 dark:bg-[#141414]/95 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] border border-[var(--primary)]/25 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#D0D0D0] dark:hover:bg-[#292929] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#737373] dark:text-[#A6A6A6]">
              <span>Paciente</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#737373]" />
              <span className="font-heading font-semibold text-[#171717] dark:text-[#F5F5F5]">
                {patientNavItems.find((n) => n.href === pathname)?.label ||
                  (pathname.startsWith("/paciente/notificacoes") ? "Notificações" : "Painel")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/agendar">
              <Button variant="primary" size="sm" className="hidden sm:inline-flex text-xs gap-1.5 rounded-xl shadow-xs">
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
