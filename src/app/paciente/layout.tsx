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
  Stethoscope,
  ChevronRight,
  Bell,
  HeartHandshake,
} from "lucide-react";

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setPatientName(d.user.name || d.user.fullName || "Paciente");
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
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform duration-200 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link href="/paciente" className="flex items-center gap-2.5 font-bold text-teal-700 dark:text-teal-400">
            <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/80 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-tight">Área do Paciente</span>
              <span className="text-[10px] text-slate-400 font-normal">Portal de Saúde</span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Patient Profile Card Snippet */}
        <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 font-medium">Conectado como</p>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{patientName}</p>
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
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 gap-2"
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
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500">
              <span>Paciente</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {patientNavItems.find((n) => n.href === pathname)?.label || "Painel"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/agendar">
              <Button size="sm" className="hidden sm:inline-flex text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white">
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
