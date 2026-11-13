"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatTime, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Video,
  Clock,
  ShieldCheck,
  Stethoscope,
  AlertTriangle,
  ArrowLeft,
  UserCheck,
  LogIn,
  ExternalLink,
  MapPin,
  Info,
} from "pulsoicon-react";
import PeerJsRoom, { PeerJsConfig } from "@/components/video/peerjs-room";

interface MeetingData {
  provider: "JITSI" | "PEERJS" | "GOOGLE_MEET";
  roomName: string;
  domain: string;
  rawMeetingUrl?: string | null;
  peerJsConfig?: PeerJsConfig | null;
  canEnter: boolean;
  isEarly: boolean;
  minutesUntilOpen: number;
  message: string;
  currentUserRole?: string;
  isPresential?: boolean;
  appointment: {
    startAt: string;
    endAt: string;
    modality?: string;
    serviceName: string;
    professionalName: string;
    patientName: string;
    address?: string;
  };
}

export default function VirtualConsultationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [inCall, setInCall] = useState(false);

  const fetchMeetingAccess = () => {
    fetch(`/api/virtual-meeting/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Acesso não autorizado ou indisponível.");
          if (data.requiresLogin || res.status === 401) {
            setRequiresLogin(true);
          }
        } else {
          setMeeting(data);
          setError(null);
          setRequiresLogin(false);
        }
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setError("Erro ao verificar acesso à teleconsulta.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchMeetingAccess();
    // Atualiza a cada 30 segundos enquanto na sala de espera
    const interval = setInterval(fetchMeetingAccess, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F8F8F8] dark:bg-[#0C0C0C] p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-[#737373] dark:text-[#A6A6A6]">Conectando à sala segura de teleconsulta...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#F8F8F8] dark:bg-[#0C0C0C]">
        <Card className="max-w-md w-full text-center p-5 sm:p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">Acesso Não Autorizado ou Indisponível</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {error || "O link de acesso à teleconsulta é inválido ou expirou."}
          </CardDescription>
          <div className="pt-2">
            {requiresLogin ? (
              <Link href={`/login?redirect=/consulta-virtual/${token}`} className="block sm:inline-block">
                <Button size="sm" className="w-full sm:w-auto gap-2 text-xs">
                  <LogIn className="h-4 w-4" />
                  <span>Fazer Login para Entrar</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login" className="block sm:inline-block">
                <Button size="sm" className="w-full sm:w-auto mt-2 text-xs">
                  Acessar Minha Conta
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const { appointment } = meeting;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8F8F8] dark:bg-[#0C0C0C] text-[#171717] dark:text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] dark:border-[#2C2C2C] bg-white/90 dark:bg-[#141414]/95 backdrop-blur-md px-3.5 sm:px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold text-[var(--primary)] min-w-0">
          <Stethoscope className="h-5 w-5 shrink-0" />
          <span className="text-sm truncate">PSI Teleconsulta Segura</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3.5 sm:p-6 flex flex-col items-center justify-center">
        {inCall ? (
          meeting.provider === "PEERJS" && meeting.peerJsConfig ? (
            /* Chamada Ativa via PeerJS / WebRTC Direto */
            <PeerJsRoom
              config={meeting.peerJsConfig}
              professionalName={appointment.professionalName}
              patientName={appointment.patientName}
              onHangup={() => setInCall(false)}
            />
          ) : (
            /* Chamada Ativa (Iframe Jitsi Meet) */
            <div className="w-full h-[72dvh] sm:h-[80vh] rounded-2xl overflow-hidden border border-[#E5E5E5] dark:border-[#2C2C2C] shadow-xl bg-black relative flex flex-col">
              <iframe
                src={`https://${meeting.domain}/${meeting.roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full flex-1 border-0"
                title="Sessão de Teleconsulta PSI"
              />
              <div className="p-3 bg-[#141414] text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#2C2C2C]">
                <span className="truncate">Sessão em andamento com {appointment.professionalName}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto h-8 sm:h-7 text-xs shrink-0"
                  onClick={() => setInCall(false)}
                >
                  Sair da Chamada
                </Button>
              </div>
            </div>
          )
        ) : meeting.isPresential || appointment.modality === "PRESENTIAL" ? (
          /* Atendimento Presencial - Nunca exibe sala ou botão de vídeo */
          <Card className="max-w-lg w-full text-center border-[#E5E5E5] dark:border-[#2C2C2C] shadow-lg animate-in zoom-in-95">
            <CardHeader className="space-y-3 pb-2 p-5 sm:p-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <MapPin className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div className="flex justify-center">
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  Consulta Presencial
                </Badge>
              </div>
              <CardTitle className="text-lg sm:text-xl">Atendimento Presencial Confirmado</CardTitle>
              <CardDescription className="text-xs">
                {appointment.serviceName} • {appointment.professionalName}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 text-xs">
              <div className="p-4 bg-[#F8F8F8] dark:bg-[#141414] border border-[#E5E5E5] dark:border-[#2C2C2C] rounded-xl space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] pb-2">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Profissional:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.professionalName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] pb-2">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Paciente:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.patientName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] pb-2">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Data:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{formatDate(appointment.startAt)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] pb-2">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Horário:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{formatTime(appointment.startAt)} às {formatTime(appointment.endAt)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#E5E5E5] dark:border-[#262626] pb-2">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Atendimento:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.serviceName}</span>
                </div>
                <div className="pt-1">
                  <span className="text-[#737373] dark:text-[#A6A6A6] block text-[11px] mb-0.5">Endereço do Consultório:</span>
                  <p className="font-medium text-[#171717] dark:text-[#F5F5F5]">{appointment.address || "Endereço cadastrado na confirmação do agendamento."}</p>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-1.5 text-left text-[11px] text-blue-900 dark:text-blue-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Orientações para o Atendimento Presencial:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1 opacity-90">
                  <li>Por favor, chegue com 10 minutos de antecedência ao local.</li>
                  <li>Apresente um documento de identificação com foto na recepção.</li>
                  <li>Em caso de imprevisto ou necessidade de reagendamento, entre em contato previamente.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Link href={meeting.currentUserRole === "ADMIN" ? "/admin/agenda" : "/paciente"} className="block">
                  <Button variant="outline" className="w-full text-xs">
                    {meeting.currentUserRole === "ADMIN" ? "Voltar à Agenda" : "Voltar ao Meu Painel"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : meeting.canEnter ? (
          /* Sala de Espera Liberada */
          <Card className="max-w-lg w-full text-center border-[var(--primary)] shadow-lg animate-in zoom-in-95">
            <CardHeader className="space-y-3 pb-2 p-5 sm:p-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mx-auto">
                <Video className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <CardTitle className="text-lg sm:text-xl">Sala de Teleconsulta Pronta</CardTitle>
              <CardDescription className="text-xs">
                {appointment.serviceName} • {appointment.professionalName}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="p-3.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl text-xs space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Profissional:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.professionalName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Paciente:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.patientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Data:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{formatDate(appointment.startAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Horário:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{formatTime(appointment.startAt)} às {formatTime(appointment.endAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#737373] dark:text-[#A6A6A6]">Atendimento:</span>
                  <span className="font-semibold text-[#171717] dark:text-[#F5F5F5]">{appointment.serviceName}</span>
                </div>
              </div>

              <Alert variant="info" title="Privacidade e Criptografia">
                Sua consulta é realizada em ambiente seguro e confidencial com áudio e vídeo criptografados, sem gravação no servidor do PSI.
              </Alert>

              {meeting.provider === "GOOGLE_MEET" ? (
                <a
                  href={meeting.rawMeetingUrl || meeting.roomName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block"
                >
                  <Button
                    size="lg"
                    className="w-full gap-2 text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Entrar na Sessão Agora</span>
                  </Button>
                </a>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setInCall(true)}
                  className="w-full gap-2 text-sm"
                >
                  <Video className="h-4 w-4" />
                  <span>Entrar na Sessão Agora</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Sala de Espera Antecipada (Mais de 15 minutos antes) */
          <Card className="max-w-md w-full text-center border-[#E5E5E5] dark:border-[#333333] shadow-md">
            <CardHeader className="space-y-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="h-7 w-7" />
              </div>
              <CardTitle className="text-lg">Sala de Espera Virtual</CardTitle>
              <CardDescription className="text-xs">
                Aguardando abertura da sala de teleconsulta
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-xs">
              <p className="text-[#525252] dark:text-[#CCCCCC]">
                {meeting.message}
              </p>

              <div className="p-3.5 bg-[#F8F8F8] dark:bg-[#141414] rounded-xl border border-[#E5E5E5] dark:border-[#333333] space-y-1.5 font-medium text-[#171717] dark:text-[#F5F5F5] text-left">
                <div>Consulta: <strong>{appointment.serviceName}</strong></div>
                <div>Data: <strong>{formatDate(appointment.startAt)}</strong> às <strong>{formatTime(appointment.startAt)}</strong></div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#737373] dark:text-[#A6A6A6] pt-2">
                <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-ping" />
                <span>Esta página atualizará automaticamente quando o horário for liberado.</span>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-[#E5E5E5] dark:border-[#333333] py-4 text-center text-[11px] text-[#737373] dark:text-[#A6A6A6]">
        Ambiente de Teleconsulta Integrado PSI • Total sigilo e criptografia ponta a ponta
      </footer>
    </div>
  );
}
