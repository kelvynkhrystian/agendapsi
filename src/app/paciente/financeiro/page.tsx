"use client";

import React, { useEffect, useState } from "react";
import { formatBRL, formatDate, formatTime, formatPaymentStatus, formatPaymentMethod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { DollarSign, Boxes, CheckCircle, XCircle, CreditCard, Clock } from "lucide-react";

interface PackageProposal {
  id: string;
  title: string;
  description?: string;
  totalPriceCents: number;
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  expiresAt?: string;
  holds: Array<{
    id: string;
    startAt: string;
  }>;
  appointments: Array<{
    id: string;
    startAt: string;
  }>;
}

interface PaymentRecord {
  id: string;
  amountCents: number;
  status: string;
  method: string;
  createdAt: string;
  appointment?: {
    service: { name: string };
  };
  package?: {
    title: string;
  };
}

export default function PatientFinancePage() {
  const [packages, setPackages] = useState<PackageProposal[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = () => {
    setIsLoading(true);
    Promise.all([
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
    ])
      .then(([pkgs, payData]) => {
        setPackages(Array.isArray(pkgs) ? pkgs : []);
        setPayments(Array.isArray(payData.payments) ? payData.payments : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcceptPackage = async (id: string) => {
    try {
      const res = await fetch(`/api/packages/${id}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Proposta aceita com sucesso!");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectPackage = async (id: string) => {
    if (!confirm("Deseja realmente recusar esta proposta? Os horários reservados serão liberados.")) return;
    try {
      const res = await fetch(`/api/packages/${id}/reject`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Proposta recusada.");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingProposals = packages.filter((p) => p.status === "PROPOSED");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pagamentos & Pacotes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Consulte seus pagamentos e avalie propostas de pacotes de sessões.
        </p>
      </div>

      {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

      {/* Propostas de Pacotes Pendentes */}
      {pendingProposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[#171717] dark:text-[#F5F5F5]">
            <Boxes className="h-5 w-5 text-[var(--primary)]" />
            <span>Propostas de Pacotes Aguardando sua Aprovação</span>
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {pendingProposals.map((pkg) => (
              <Card key={pkg.id} className="border-[var(--primary)]/60 shadow-md">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg font-bold">{pkg.title}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {pkg.description || "Pacote de sessões terapêuticas personalizadas"}
                    </CardDescription>
                  </div>
                  <span className="text-xl font-extrabold text-[var(--primary)]">
                    {formatBRL(pkg.totalPriceCents)}
                  </span>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                    <span className="font-semibold block text-slate-700 dark:text-slate-300">
                      Sessões e Horários Propostos:
                    </span>
                    {pkg.holds.map((h, i) => (
                      <div key={i} className="text-slate-600 dark:text-slate-400">
                        • Sessão {i + 1}: <strong>{formatDate(h.startAt)}</strong> às <strong>{formatTime(h.startAt)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500">
                      Ao aceitar, todas as consultas acima serão confirmadas simultaneamente na agenda.
                    </span>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 sm:flex-none text-xs"
                        onClick={() => handleRejectPackage(pkg.id)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleAcceptPackage(pkg.id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Aceitar Proposta
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Histórico Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cobranças e Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Carregando pagamentos...</div>
          ) : payments.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-sm block">
                      {p.appointment ? p.appointment.service.name : p.package ? p.package.title : "Consulta"}
                    </span>
                    <span className="text-slate-500">
                      {formatDate(p.createdAt)} • {formatPaymentMethod(p.method)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm font-mono">
                      {formatBRL(p.amountCents)}
                    </span>
                    <Badge variant={p.status === "APPROVED" ? "success" : "warning"}>
                      {formatPaymentStatus(p.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum pagamento registrado até o momento.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
