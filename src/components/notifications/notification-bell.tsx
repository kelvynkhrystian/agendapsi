"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink, Clock } from "pulsoicon-react";
import { formatDate, formatTime } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientRole: string;
  eventType: string;
  title: string;
  message: string;
  targetUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationBell({ role }: { role: "ADMIN" | "PATIENT" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications?limit=8");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error("Erro ao buscar notificações:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling leve a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (e) {
      console.error("Erro ao marcar lida:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error("Erro ao marcar todas como lidas:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.targetUrl) {
      router.push(notif.targetUrl);
    }
  };

  const historyUrl = role === "ADMIN" ? "/admin/notificacoes" : "/paciente/notificacoes";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl bg-white border border-[#E5E5E5] text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.04] dark:bg-[#1E1E1E] dark:border-[#2C2C2C] dark:text-[#C0C0C0] dark:hover:bg-[#262626] dark:hover:text-[#F5F5F5] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        title="Notificações"
        aria-label="Abrir notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#202020] animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#202020] shadow-xl border border-[#E5E5E5] dark:border-[#393939] z-50 overflow-hidden text-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5] dark:border-[#393939] bg-[#F8F8F8] dark:bg-[#1B1B1B]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#171717] dark:text-[#F5F5F5]">
                Notificações
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] dark:bg-[#292929] dark:text-[#FFFFFF] dark:border dark:border-[#393939] text-[10px] font-semibold">
                  {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isLoading}
                className="flex items-center gap-1 text-[11px] text-[var(--primary)] dark:text-[#D0D0D0] hover:opacity-80 dark:hover:text-[#FFFFFF] font-medium transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Marcar lidas</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E5E5E5] dark:divide-[#393939]">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                    !n.isRead
                      ? "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 dark:bg-[#292929]/50 dark:hover:bg-[#292929]/80"
                      : "hover:bg-[#F8F8F8] dark:hover:bg-[#292929]/60"
                  }`}
                >
                  {/* Unread dot */}
                  <div className="pt-1 shrink-0">
                    <span
                      className={`block h-2 w-2 rounded-full ${
                        !n.isRead ? "bg-[var(--primary)] dark:bg-[#FFFFFF]" : "bg-transparent"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p
                      className={`text-xs leading-snug truncate ${
                        !n.isRead
                          ? "font-bold text-[#171717] dark:text-[#F5F5F5]"
                          : "font-medium text-[#525252] dark:text-[#D0D0D0]"
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-[11px] text-[#737373] dark:text-[#A6A6A6] line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 text-[10px] text-[#737373] dark:text-[#A6A6A6]">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDate(n.createdAt)} às {formatTime(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1 pt-0.5">
                    {!n.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="p-1 rounded-md text-[#737373] dark:text-[#A6A6A6] hover:text-[var(--primary)] dark:hover:text-[#FFFFFF] hover:bg-[var(--primary)]/10 dark:hover:bg-[#383838] transition-colors"
                        title="Marcar como lida"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {n.targetUrl && (
                      <span className="text-[#737373] dark:text-[#A6A6A6] hover:text-[#171717] dark:hover:text-[#FFFFFF]">
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-[#737373] dark:text-[#A6A6A6] space-y-1">
                <Bell className="h-6 w-6 mx-auto text-[#A6A6A6] dark:text-[#525252]" />
                <p className="text-xs">Nenhuma notificação no momento.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[#E5E5E5] dark:border-[#393939] text-center bg-[#F8F8F8] dark:bg-[#1B1B1B]">
            <Link
              href={historyUrl}
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[var(--primary)] dark:text-[#D0D0D0] hover:opacity-80 dark:hover:text-[#FFFFFF] hover:underline inline-block py-1"
            >
              Ver histórico completo de notificações &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
