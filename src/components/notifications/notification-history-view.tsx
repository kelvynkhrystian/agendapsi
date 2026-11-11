"use client";

import React, { useState, useEffect } from "react";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Clock, ExternalLink, Filter } from "pulsoicon-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  targetUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export function NotificationHistoryView({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?filter=${filter}&page=${page}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotalPages(data.totalPages || 1);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filter, page]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171717] dark:text-[#F5F5F5]">{title}</h1>
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6] mt-1">{subtitle}</p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-2 shrink-0 text-xs"
          >
            <CheckCheck className="h-4 w-4 text-[var(--primary)] dark:text-[#C0C0C0]" />
            <span>Marcar todas como lidas</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E5] dark:border-[#393939] pb-3">
        <Filter className="h-4 w-4 text-[#737373] dark:text-[#C0C0C0]" />
        <button
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white border border-[var(--primary)]/20 text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-[#2C2C2C] dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#FFFFFF]"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => {
            setFilter("unread");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
            filter === "unread"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white border border-[var(--primary)]/20 text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-[#2C2C2C] dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#FFFFFF]"
          }`}
        >
          <span>Não lidas</span>
          {unreadCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filter === "unread" ? "bg-white/20 text-white" : "bg-[var(--primary)]/15 text-[var(--primary)] dark:bg-[#333333] dark:text-[#FFFFFF]"}`}>
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setFilter("read");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "read"
              ? "bg-[var(--button-bg,var(--primary))] text-[var(--button-fg,#ffffff)] font-semibold shadow-xs"
              : "bg-white border border-[var(--primary)]/20 text-[var(--button-outline-fg,var(--button-bg,var(--primary)))] hover:bg-[var(--primary)]/[0.04] dark:bg-[#1C1C1C] dark:border-[#2C2C2C] dark:text-[#D0D0D0] dark:hover:bg-[#242424] dark:hover:text-[#FFFFFF]"
          }`}
        >
          Lidas
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[#F2F2F2] dark:bg-[#202020] animate-pulse" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${
                !n.isRead
                  ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 dark:border-[#525252] dark:bg-[#292929] shadow-xs"
                  : "bg-white dark:bg-[#202020] border-[#E5E5E5] dark:border-[#393939]"
              }`}
            >
              <CardContent className="p-6 !pt-6 sm:p-6 sm:!pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-[var(--primary)] dark:bg-[#FFFFFF] shrink-0" />
                    )}
                    <h3 className="font-semibold text-sm text-[#171717] dark:text-[#F5F5F5] truncate">
                      {n.title}
                    </h3>
                    <span className="text-[11px] text-[#737373] dark:text-[#A6A6A6] flex items-center gap-1 shrink-0 ml-auto sm:ml-2">
                      <Clock className="h-3 w-3" />
                      {formatDate(n.createdAt)} às {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#525252] dark:text-[#D0D0D0] leading-relaxed">
                    {n.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMarkAsRead(n.id)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Marcar lida</span>
                    </Button>
                  )}
                  {n.targetUrl && (
                    <Link href={n.targetUrl}>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                        <span>Acessar</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-[#737373] dark:text-[#A6A6A6]">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="py-12 text-center text-[#737373] dark:text-[#A6A6A6]">
          <CardContent className="p-6 pt-6 sm:p-6 sm:pt-6 space-y-2">
            <Bell className="h-8 w-8 mx-auto text-[#737373] dark:text-[#A6A6A6]" />
            <p className="text-sm font-medium text-[#171717] dark:text-[#F5F5F5]">Nenhuma notificação encontrada.</p>
            <p className="text-xs text-[#737373] dark:text-[#A6A6A6]">
              Quando novos eventos ocorrerem, eles aparecerão registrados aqui.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
