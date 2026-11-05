"use client";

import React, { useEffect, useState } from "react";
import { formatBRL, formatDate, formatTime, formatPaymentStatus, formatPaymentMethod } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  RotateCcw,
  AlertTriangle,
  Receipt,
} from "lucide-react";

interface PaymentItem {
  id: string;
  amountCents: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED";
  method: "ONLINE_SIMULATED" | "IN_PERSON" | "WHATSAPP_ARRANGED";
  isSimulated: boolean;
  confirmedAt?: string;
  createdAt: string;
  patient: {
    fullName: string;
    email: string;
    phone: string;
  };
  appointment?: {
    startAt: string;
    service: { name: string };
  };
  package?: {
    title: string;
  };
  refunds: Array<{
    amountCents: number;
    reason?: string;
    refundedAt: string;
  }>;
}

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [totals, setTotals] = useState({
    realApprovedCents: 0,
    simulatedApprovedCents: 0,
    pendingCents: 0,
  });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Modal Estorno
  const [refundPayment, setRefundPayment] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchPayments = () => {
    setIsLoading(true);
    let url = "/api/payments?";
    if (statusFilter !== "ALL") url += `status=${statusFilter}&`;
    if (methodFilter !== "ALL") url += `method=${methodFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        setPayments(Array.isArray(d.payments) ? d.payments : []);
        if (d.totals) setTotals(d.totals);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  // Confirmação manual de pagamento (Presencial ou WhatsApp)
  const handleConfirmManual = async (id: string) => {
    try {
      const res = await fetch(`/api/payments/${id}/confirm-manual`, {
        method: "POST",
      });
      if (res.ok) {
        setActionMessage("Pagamento confirmado manualmente com sucesso!");
        fetchPayments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Processamento de Estorno
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPayment) return;
    setIsRefunding(true);

    try {
      const res = await fetch(`/api/payments/${refundPayment.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason }),
      });

      if (res.ok) {
        setRefundPayment(null);
        setRefundReason("");
        setIsRefunding(false);
        setActionMessage("Estorno processado com sucesso!");
        fetchPayments();
      }
    } catch (e) {
      console.error(e);
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão Financeira</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Controle de cobranças, recebimentos presenciais, estornos e simulador de pagamentos.
        </p>
      </div>

      {actionMessage && <Alert variant="success">{actionMessage}</Alert>}

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Receita Real Registrada */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Receita Real Confirmada
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatBRL(totals.realApprovedCents)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pagamentos presenciais confirmados pelo profissional
            </p>
          </CardContent>
        </Card>

        {/* Receita Simulada (Fake Provider) */}
        <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Receita Simulada
              </CardTitle>
              <Badge variant="simulated">SIMULADO</Badge>
            </div>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {formatBRL(totals.simulatedApprovedCents)}
            </div>
            <p className="text-xs text-purple-600/80 mt-1">
              Ambiente de testes (FakePaymentProvider)
            </p>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Recebimentos a Confirmar
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatBRL(totals.pendingCents)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Aguardando confirmação manual ou pagamento online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="APPROVED">Aprovados</option>
            <option value="PENDING">Pendentes</option>
            <option value="REFUNDED">Estornados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="REJECTED">Rejeitados</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Método:</span>
          <select
            className="h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="ALL">Todos os Meios</option>
            <option value="ONLINE_SIMULATED">Online Simulado</option>
            <option value="IN_PERSON">Presencial</option>
            <option value="WHATSAPP_ARRANGED">Combinado WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Tabela de Lançamentos */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
              Carregando lançamentos financeiros...
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="p-3.5 font-semibold">Paciente</th>
                    <th className="p-3.5 font-semibold">Referência</th>
                    <th className="p-3.5 font-semibold">Valor</th>
                    <th className="p-3.5 font-semibold">Método</th>
                    <th className="p-3.5 font-semibold">Status</th>
                    <th className="p-3.5 font-semibold">Data</th>
                    <th className="p-3.5 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-3.5">
                        <span className="font-semibold block">{p.patient.fullName}</span>
                        <span className="text-[11px] text-slate-400">{p.patient.phone}</span>
                      </td>

                      <td className="p-3.5">
                        {p.appointment ? (
                          <span>Consulta: {p.appointment.service.name}</span>
                        ) : p.package ? (
                          <span>Pacote: {p.package.title}</span>
                        ) : (
                          <span>Lançamento Geral</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold font-mono text-sm">
                        {formatBRL(p.amountCents)}
                      </td>

                      <td className="p-3.5">
                        <span>{formatPaymentMethod(p.method)}</span>
                        {p.isSimulated && (
                          <Badge variant="simulated" className="ml-1.5 text-[9px]">
                            Simulado
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            p.status === "APPROVED"
                              ? "success"
                              : p.status === "PENDING"
                              ? "warning"
                              : p.status === "REFUNDED"
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {formatPaymentStatus(p.status)}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-slate-500">
                        {formatDate(p.createdAt)}
                      </td>

                      <td className="p-3.5 text-right space-x-1.5">
                        {p.status === "PENDING" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleConfirmManual(p.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            <span>Confirmar Pagamento</span>
                          </Button>
                        )}

                        {p.status === "APPROVED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-red-500 hover:text-red-700"
                            onClick={() => setRefundPayment(p)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            <span>Estornar</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400">
              Nenhum registro financeiro encontrado com os filtros selecionados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Estorno */}
      {refundPayment && (
        <Modal
          isOpen={!!refundPayment}
          onClose={() => setRefundPayment(null)}
          title="Processar Estorno de Pagamento"
          description={`Valor original: ${formatBRL(refundPayment.amountCents)} — Paciente: ${refundPayment.patient.fullName}`}
        >
          <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
            <Alert variant="warning" title="Atenção ao Estorno">
              Esta ação registrará o cancelamento financeiro e atualizará o status do pagamento para Estornado.
            </Alert>

            <Input
              label="Motivo do Estorno"
              placeholder="Ex: Cancelamento de sessão solicitado pelo paciente"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRefundPayment(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" isLoading={isRefunding}>
                Confirmar Estorno
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
