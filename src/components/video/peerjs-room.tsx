"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PeerJsConfig {
  host: string;
  port: number;
  path: string;
  secure: boolean;
  stunServer?: string | null;
  turnServer?: string | null;
  turnUser?: string | null;
  turnSecret?: string | null;
  role: "doctor" | "patient";
  peerId: string;
  targetPeerId: string;
}

interface PeerJsRoomProps {
  config: PeerJsConfig;
  professionalName: string;
  patientName: string;
  onHangup: () => void;
}

type ConnectionStatus =
  | "INITIALIZING"
  | "SIGNALING_CONNECTING"
  | "WAITING"
  | "CALLING"
  | "CONNECTED"
  | "ERROR";

export default function PeerJsRoom({
  config,
  professionalName,
  patientName,
  onHangup,
}: PeerJsRoomProps) {
  const [status, setStatus] = useState<ConnectionStatus>("INITIALIZING");
  const [statusMessage, setStatusMessage] = useState<string>("Iniciando mídia e conexão...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerInstanceRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const otherPersonName =
    config.role === "doctor" ? patientName : professionalName;

  // 1. Inicializa Stream local e conexão com o servidor de sinalização
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setStatus("INITIALIZING");
        setStatusMessage("Solicitando permissão de câmera e microfone...");

        // Permissão de mídia
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
        } catch (mediaErr: unknown) {
          console.error("Erro ao obter mídia local:", mediaErr);
          setErrorMessage(
            "Permissão de câmera ou microfone negada. Verifique as configurações de privacidade do seu navegador."
          );
          setStatus("ERROR");
          return;
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setStatus("SIGNALING_CONNECTING");
        setStatusMessage("Conectando ao servidor de sinalização seguro...");

        // Import dinâmico do peerjs no client
        const { default: Peer } = await import("peerjs");

        const iceServers: RTCIceServer[] = [];
        if (config.stunServer) {
          iceServers.push({ urls: config.stunServer });
        } else {
          iceServers.push({ urls: "stun:stun.l.google.com:19302" });
        }

        if (config.turnServer) {
          iceServers.push({
            urls: config.turnServer,
            username: config.turnUser || undefined,
            credential: config.turnSecret || undefined,
          });
        }

        const peer = new Peer(config.peerId, {
          host: config.host,
          port: Number(config.port),
          path: config.path || "/peerjs",
          secure: Boolean(config.secure),
          config: {
            iceServers,
          },
        });

        peerInstanceRef.current = peer;

        peer.on("open", () => {
          if (!isMounted) return;
          console.log(`[PSI WebRTC] Peer aberto com ID: ${config.peerId}`);
          setStatus("WAITING");
          setStatusMessage(`Aguardando ${otherPersonName} entrar na sala...`);
          // Tenta chamar imediatamente
          tryCallTargetPeer();
        });

        // Recebimento de chamada da outra ponta
        peer.on("call", (incomingCall: any) => {
          if (!isMounted) return;
          console.log("[PSI WebRTC] Chamada recebida, atendendo com stream local...");
          incomingCall.answer(localStreamRef.current);

          incomingCall.on("stream", (remoteStream: MediaStream) => {
            if (!isMounted) return;
            console.log("[PSI WebRTC] Stream remoto recebido via chamada atendida!");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setStatus("CONNECTED");
            setStatusMessage("Conexão P2P estabelecida!");
          });

          incomingCall.on("close", () => {
            if (!isMounted) return;
            console.log("[PSI WebRTC] Chamada fechada pelo peer remoto.");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            setStatus("WAITING");
            setStatusMessage(`${otherPersonName} saiu da chamada. Aguardando reconexão...`);
          });

          incomingCall.on("error", (err: unknown) => {
            console.error("[PSI WebRTC] Erro na chamada:", err);
          });

          activeCallRef.current = incomingCall;
        });

        peer.on("error", (err: any) => {
          if (!isMounted) return;
          console.warn("[PSI WebRTC] Evento de status do peer:", err?.type, err?.message);
          if (err.type === "peer-unavailable") {
            // A outra ponta ainda não conectou no servidor de sinalização
            setStatus("WAITING");
            setStatusMessage(`Aguardando ${otherPersonName} entrar na sala...`);
          } else if (err.type === "unavailable-id") {
            // Sessão com ID duplicado ou já em uso
            setStatus("WAITING");
            setStatusMessage("Reestabelecendo identificador da sala...");
          } else {
            setErrorMessage(`Erro de sinalização WebRTC: ${err.message || err.type}`);
            setStatus("ERROR");
          }
        });

        // Loop de reconexão / tentativa de chamada enquanto a sala aguarda a outra ponta
        retryIntervalRef.current = setInterval(() => {
          if (!isMounted) return;
          if (status !== "CONNECTED" && !activeCallRef.current) {
            tryCallTargetPeer();
          }
        }, 4000);
      } catch (err: unknown) {
        console.error("Falha ao inicializar PeerJS:", err);
        setErrorMessage("Erro ao iniciar o módulo de vídeo WebRTC.");
        setStatus("ERROR");
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
      }
      if (activeCallRef.current) {
        activeCallRef.current.close();
      }
      if (peerInstanceRef.current) {
        peerInstanceRef.current.destroy();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [config.peerId]);

  // Função para chamar o outro peer
  const tryCallTargetPeer = () => {
    const peer = peerInstanceRef.current;
    const localStream = localStreamRef.current;
    if (!peer || peer.destroyed || !localStream) return;

    try {
      const call = peer.call(config.targetPeerId, localStream);
      if (!call) return;

      call.on("stream", (remoteStream: MediaStream) => {
        console.log("[PSI WebRTC] Stream remoto recebido via chamada efetuada!");
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setStatus("CONNECTED");
        setStatusMessage("Conexão P2P estabelecida!");
      });

      call.on("close", () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        activeCallRef.current = null;
        setStatus("WAITING");
        setStatusMessage(`${otherPersonName} desconectou. Aguardando reconexão...`);
      });

      call.on("error", (err: any) => {
        console.warn("[PSI WebRTC] Erro ao chamar target peer:", err);
      });

      activeCallRef.current = call;
    } catch (e) {
      // Ignora falhas transitórias antes do peer estar registrado
    }
  };

  // Alterna áudio (microfone)
  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Alterna vídeo (câmera)
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Encerramento da chamada
  const handleHangup = () => {
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    if (activeCallRef.current) activeCallRef.current.close();
    if (peerInstanceRef.current) peerInstanceRef.current.destroy();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    onHangup();
  };

  return (
    <div className="w-full h-[82vh] rounded-2xl overflow-hidden border border-[#E5E5E5] dark:border-[#2C2C2C] shadow-2xl bg-[#0C0C0C] relative flex flex-col">
      {/* Top Bar com Status */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Badge
            variant={
              status === "CONNECTED"
                ? "success"
                : status === "ERROR"
                ? "destructive"
                : "outline"
            }
            className="text-xs gap-1.5 py-1 px-2.5 backdrop-blur-md"
          >
            {status === "CONNECTED" && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            {status === "WAITING" && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
            {status === "CONNECTED"
              ? "P2P WebRTC Criptografado"
              : status === "WAITING"
              ? "Aguardando Participante"
              : status === "SIGNALING_CONNECTING"
              ? "Conectando Sinalização..."
              : status === "ERROR"
              ? "Erro de Conexão"
              : "Iniciando"}
          </Badge>
          <span className="text-xs text-[#D0D0D0] hidden sm:inline">
            {config.role === "doctor" ? `Paciente: ${patientName}` : `Profissional: ${professionalName}`}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#D0D0D0]">
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
          <span className="hidden sm:inline">Sem gravação no servidor</span>
        </div>
      </div>

      {/* Main Video Viewport (Remote Peer) */}
      <div className="flex-1 relative flex items-center justify-center bg-[#0C0C0C] overflow-hidden">
        {status === "CONNECTED" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 max-w-sm space-y-4 animate-in fade-in">
            {status === "ERROR" ? (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-semibold text-white">Falha na Conexão WebRTC</h3>
                <p className="text-xs text-[#A6A6A6] leading-relaxed">{errorMessage}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="gap-2 text-xs !bg-[#1A1A1A] !border-[#393939] !text-white hover:!bg-[#262626]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tentar Novamente</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 text-[var(--primary)] flex items-center justify-center mx-auto">
                  <User className="h-8 w-8 animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-white">{statusMessage}</h3>
                <p className="text-xs text-[#A6A6A6]">
                  {config.role === "doctor"
                    ? `A sala permanecerá aberta até o paciente conectar.`
                    : `Seu profissional de saúde se conectará em instantes.`}
                </p>
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={tryCallTargetPeer}
                    className="gap-2 text-xs !bg-[#1A1A1A] !border-[#393939] !text-[#F5F5F5] hover:!bg-[#262626]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Reconectar Sinalização</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local Self-View PiP (Picture in Picture) */}
        <div className="absolute bottom-20 right-4 z-20 w-32 h-24 sm:w-48 sm:h-36 rounded-xl overflow-hidden border-2 border-[var(--primary)]/60 shadow-xl bg-[#141414]">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              !isVideoEnabled ? "opacity-0" : "opacity-100"
            }`}
          />
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A] text-[#A6A6A6]">
              <VideoOff className="h-6 w-6" />
            </div>
          )}
          <div className="absolute bottom-1 left-2 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
            Você ({isAudioEnabled ? "Áudio ativo" : "Mudo"})
          </div>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-3 bg-[#141414] border-t border-[#2C2C2C] flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          {/* Microfone */}
          <Button
            size="sm"
            variant={isAudioEnabled ? "outline" : "destructive"}
            onClick={toggleAudio}
            className={`h-9 px-3 gap-2 text-xs rounded-full ${
              isAudioEnabled ? "!bg-[#202020] !border-[#393939] !text-white hover:!bg-[#292929]" : ""
            }`}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{isAudioEnabled ? "Silenciar" : "Ativar Mic"}</span>
          </Button>

          {/* Câmera */}
          <Button
            size="sm"
            variant={isVideoEnabled ? "outline" : "destructive"}
            onClick={toggleVideo}
            className={`h-9 px-3 gap-2 text-xs rounded-full ${
              isVideoEnabled ? "!bg-[#202020] !border-[#393939] !text-white hover:!bg-[#292929]" : ""
            }`}
          >
            {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            <span className="hidden sm:inline">{isVideoEnabled ? "Desligar Câmera" : "Ligar Câmera"}</span>
          </Button>
        </div>

        {/* Encerrar / Sair */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleHangup}
          className="h-9 px-4 gap-2 text-xs rounded-full bg-red-600 hover:bg-red-700 text-white font-medium"
        >
          <PhoneOff className="h-4 w-4" />
          <span>Sair da Chamada</span>
        </Button>
      </div>
    </div>
  );
}
