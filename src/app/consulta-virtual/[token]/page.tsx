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
} from "lucide-react";
import PeerJsRoom, { PeerJsConfig } from "@/components/video/peerjs-room";

interface MeetingData {
  provider: "JITSI" | "PEERJS" | "GOOGLE_MEET";
  roomName: string;
  domain: string;
  peerJsConfig?: PeerJsConfig | null;
  canEnter: boolean;
  isEarly: boolean;
  minutesUntilOpen: number;
  message: string;
  currentUserRole?: string;
  appointment: {
    startAt: string;
    endAt: string;
    serviceName: string;
    professionalName: string;
    patientName: string;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Conectando à sala segura de teleconsulta...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">Acesso Não Autorizado ou Indisponível</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {error || "O link de acesso à teleconsulta é inválido ou expirou."}
          </CardDescription>
          <div className="pt-2">
            {requiresLogin ? (
              <Link href={`/login?redirect=/consulta-virtual/${token}`}>
                <Button size="sm" className="gap-2 text-xs">
                  <LogIn className="h-4 w-4" />
                  <span>Fazer Login para Entrar</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" className="mt-2 text-xs">
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
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-teal-700 dark:text-teal-400">
          <Stethoscope className="h-5 w-5" />
          <span className="text-sm">PSI Teleconsulta Segura</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
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
            <div className="w-full h-[80vh] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-black relative flex flex-col">
              <iframe
                src={`https://${meeting.domain}/${meeting.roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="w-full flex-1 border-0"
                title="Sessão de Teleconsulta PSI"
              />
              <div className="p-3 bg-slate-900 text-white text-xs flex items-center justify-between">
                <span>Sessão em andamento com {appointment.professionalName}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setInCall(false)}
                >
                  Sair da Chamada
                </Button>
              </div>
            </div>
          )
        ) : meeting.canEnter ? (
          /* Sala de Espera Liberada */
          <Card className="max-w-lg w-full text-center border-teal-500 shadow-lg animate-in zoom-in-95">
            <CardHeader className="space-y-3 pb-2">
              <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <Video className="h-8 w-8" />
              </div>
              <CardTitle className="text-xl">Sala de Teleconsulta Pronta</CardTitle>
              <CardDescription className="text-xs">
                {appointment.serviceName} • {appointment.professionalName}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl text-xs space-y-1">
                <div>Paciente: <strong>{appointment.patientName}</strong></div>
                <div>Horário: <strong>{formatTime(appointment.startAt)} às {formatTime(appointment.endAt)}</strong></div>
                <div>Provedor: <strong>{meeting.provider === "PEERJS" ? "PeerJS / WebRTC Direto" : "Jitsi Meet"}</strong></div>
              </div>

              <Alert variant="info" title="Privacidade e Criptografia">
                {meeting.provider === "PEERJS"
                  ? "Sua chamada é realizada ponto a ponto (P2P) com áudio e vídeo criptografados diretamente entre seu dispositivo e o profissional, sem intermediação de servidores de mídia."
                  : "Sua chamada é processada de ponta a ponta sem gravação no servidor do PSI. Verifique se sua câmera e microfone estão conectados."}
              </Alert>

              <Button
                size="lg"
                onClick={() => setInCall(true)}
                className="w-full gap-2 text-sm bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Video className="h-4 w-4" />
                <span>Entrar na Sessão Agora</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Sala de Espera Antecipada (Mais de 15 minutos antes) */
          <Card className="max-w-md w-full text-center border-slate-200 dark:border-slate-800 shadow-md">
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
              <p className="text-slate-600 dark:text-slate-400">
                {meeting.message}
              </p>

              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 font-medium">
                <div>Consulta: <strong>{appointment.serviceName}</strong></div>
                <div>Data: <strong>{formatDate(appointment.startAt)}</strong> às <strong>{formatTime(appointment.startAt)}</strong></div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                <span>Esta página atualizará automaticamente quando o horário for liberado.</span>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 text-center text-[11px] text-slate-400">
        Ambiente de Teleconsulta Integrado PSI • Provedor: {meeting.provider === "PEERJS" ? "PeerJS / WebRTC Direto" : "Jitsi Meet"}
      </footer>
    </div>
  );
}
