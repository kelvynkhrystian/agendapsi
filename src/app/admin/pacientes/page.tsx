"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";

interface Patient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cpf?: string;
  isMinor: boolean;
  isActive: boolean;
  createdAt: string;
  guardians: Array<{
    fullName: string;
    relationship: string;
    phone: string;
  }>;
  _count: {
    appointments: number;
    clinicalRecords: number;
  };
}

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = () => {
    setIsLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        setPatients(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchPatients();
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestão de Pacientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Acesse prontuários clínicos, histórico de sessões, documentos e cadastro.
          </p>
        </div>

        <Link href="/admin/pacientes/novo">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span>Cadastrar Paciente</span>
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Lista de Pacientes */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/admin/pacientes/${patient.id}`}>
              <Card className="hover:border-[var(--primary)] transition-all cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">{patient.fullName}</CardTitle>
                      {patient.isMinor && (
                        <Badge variant="warning" className="text-[10px]">
                          Menor de Idade
                        </Badge>
                      )}
                      {!patient.isActive && (
                        <Badge variant="destructive" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Cadastrado em {formatDate(patient.createdAt)}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </CardHeader>

                <CardContent className="space-y-2 pt-0 text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{patient.email}</span>
                  </div>

                  {patient.isMinor && patient.guardians.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400">
                      Responsável: <strong>{patient.guardians[0].fullName}</strong> ({patient.guardians[0].relationship})
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-500">
                    <span>{patient._count.appointments} consulta(s)</span>
                    <span>{patient._count.clinicalRecords} nota(s) de prontuário</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-500">
          <Users className="h-10 w-10 mx-auto text-slate-400 mb-3" />
          <p className="font-medium">Nenhum paciente encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">
            Cadastre um novo paciente manualmente ou aguarde novos agendamentos públicos.
          </p>
        </Card>
      )}
    </div>
  );
}
