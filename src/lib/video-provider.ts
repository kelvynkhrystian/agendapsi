export type SupportedVideoProvider = "JITSI" | "PEERJS" | "GOOGLE_MEET";

export interface VideoRoom {
  provider: SupportedVideoProvider;
  roomName: string;
  entryUrl: string;
  rawMeetingUrl: string;
  isPreparedOnly?: boolean;
}

export interface VideoProvider {
  providerKey: SupportedVideoProvider;
  isFunctional: boolean;
  createRoom(appointmentId: string): Promise<VideoRoom>;
}

/**
 * Provedor 1: Jitsi Meet (Funcional padrão V1)
 */
export class JitsiVideoProvider implements VideoProvider {
  providerKey: SupportedVideoProvider = "JITSI";
  isFunctional = true;
  private domain: string;

  constructor(domain: string = process.env.JITSI_DOMAIN || "meet.jit.si") {
    this.domain = domain;
  }

  async createRoom(appointmentId: string): Promise<VideoRoom> {
    const highEntropySuffix = Math.random().toString(36).substring(2, 12);
    const roomName = `psi-session-${appointmentId}-${highEntropySuffix}`;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const entryUrl = `${appUrl}/consulta-virtual/${token}`;
    const rawMeetingUrl = `https://${this.domain}/${roomName}`;

    return {
      provider: "JITSI",
      roomName,
      entryUrl,
      rawMeetingUrl,
    };
  }
}

/**
 * Provedor 2: PeerJS / WebRTC Direto (P2P ponto a ponto)
 * Fluxo: Chamada P2P direta com sinalização STUN/TURN e sala segura.
 */
export class PeerJsVideoProvider implements VideoProvider {
  providerKey: SupportedVideoProvider = "PEERJS";
  isFunctional: boolean;
  public serverHost: string | null;
  public serverPort: number | null;
  public path: string;
  public secure: boolean;
  public stunServer?: string | null;
  public turnServer?: string | null;
  public turnUser?: string | null;
  public turnSecret?: string | null;
  public testStatus: string | null;

  constructor(
    serverHost: string | null = null,
    serverPort: number | null = 9000,
    path: string = "/peerjs",
    secure: boolean = true,
    testStatus: string | null = null,
    options?: {
      stunServer?: string | null;
      turnServer?: string | null;
      turnUser?: string | null;
      turnSecret?: string | null;
    }
  ) {
    this.serverHost = serverHost;
    this.serverPort = serverPort;
    this.path = path || "/peerjs";
    this.secure = secure ?? true;
    this.testStatus = testStatus;
    this.stunServer = options?.stunServer;
    this.turnServer = options?.turnServer;
    this.turnUser = options?.turnUser;
    this.turnSecret = options?.turnSecret;
    // Funcional apenas quando configurado e com conectividade de sinalização validada com sucesso
    this.isFunctional = !!(serverHost && testStatus === "SUCCESS");
  }

  async createRoom(appointmentId: string): Promise<VideoRoom> {
    const highEntropySuffix = Math.random().toString(36).substring(2, 10);
    const peerRoomId = `peer-psi-${appointmentId}-${highEntropySuffix}`;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    return {
      provider: "PEERJS",
      roomName: peerRoomId,
      entryUrl: `${appUrl}/consulta-virtual/${token}`,
      rawMeetingUrl: `${appUrl}/consulta-virtual/${token}`,
      isPreparedOnly: false,
    };
  }
}

/**
 * Provedor 3: Google Meet (Adaptador extensível preparado para OAuth/Calendar)
 */
export class GoogleMeetVideoProvider implements VideoProvider {
  providerKey: SupportedVideoProvider = "GOOGLE_MEET";
  isFunctional = false; // Requer credenciais OAuth do Google Cloud Console
  private clientId: string | null;

  constructor(clientId: string | null = null) {
    this.clientId = clientId;
  }

  async createRoom(appointmentId: string): Promise<VideoRoom> {
    const token = Math.random().toString(36).substring(2, 15);
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    return {
      provider: "GOOGLE_MEET",
      roomName: `gmeet-${appointmentId}`,
      entryUrl: `${appUrl}/consulta-virtual/${token}?provider=GOOGLE_MEET`,
      rawMeetingUrl: `https://meet.google.com/new`,
      isPreparedOnly: true,
    };
  }
}

/**
 * Factory para instanciar o provedor configurado
 */
export function getVideoProvider(
  activeKey: string = "JITSI",
  options?: {
    jitsiDomain?: string;
    peerJsHost?: string | null;
    peerJsPort?: number | null;
    peerJsPath?: string;
    peerJsSecure?: boolean;
    peerJsTestStatus?: string | null;
    peerJsStunServer?: string | null;
    peerJsTurnServer?: string | null;
    peerJsTurnUser?: string | null;
    peerJsTurnSecret?: string | null;
    googleMeetClientId?: string | null;
  }
): VideoProvider {
  switch (activeKey) {
    case "PEERJS":
      return new PeerJsVideoProvider(
        options?.peerJsHost,
        options?.peerJsPort,
        options?.peerJsPath,
        options?.peerJsSecure,
        options?.peerJsTestStatus,
        {
          stunServer: options?.peerJsStunServer,
          turnServer: options?.peerJsTurnServer,
          turnUser: options?.peerJsTurnUser,
          turnSecret: options?.peerJsTurnSecret,
        }
      );
    case "GOOGLE_MEET":
      return new GoogleMeetVideoProvider(options?.googleMeetClientId);
    case "JITSI":
    default:
      return new JitsiVideoProvider(options?.jitsiDomain);
  }
}

/**
 * Validação de permissão e janela de tempo para entrada na sala de teleconsulta
 * Paciente: liberado 15 minutos antes do início
 * Admin: acesso irrestrito
 */
export function checkMeetingAccess({
  userRole,
  startAt,
  endAt,
  now = new Date(),
}: {
  userRole: "ADMIN" | "PATIENT";
  startAt: Date;
  endAt: Date;
  now?: Date;
}): {
  canEnter: boolean;
  isEarly: boolean;
  minutesUntilOpen: number;
  message: string;
} {
  if (userRole === "ADMIN") {
    return {
      canEnter: true,
      isEarly: false,
      minutesUntilOpen: 0,
      message: "Acesso administrativo concedido.",
    };
  }

  // Janela de liberação para paciente: 15 minutos antes
  const openTime = new Date(startAt.getTime() - 15 * 60000);

  if (now < openTime) {
    const diffMs = openTime.getTime() - now.getTime();
    const minutesRemaining = Math.ceil(diffMs / 60000);
    return {
      canEnter: false,
      isEarly: true,
      minutesUntilOpen: minutesRemaining,
      message: `A sala de espera abrirá 15 minutos antes da sessão (em ${minutesRemaining} minuto(s)).`,
    };
  }

  // Se a consulta já terminou há mais de 2 horas
  const closeTime = new Date(endAt.getTime() + 120 * 60000);
  if (now > closeTime) {
    return {
      canEnter: false,
      isEarly: false,
      minutesUntilOpen: 0,
      message: "Esta sessão foi encerrada.",
    };
  }

  return {
    canEnter: true,
    isEarly: false,
    minutesUntilOpen: 0,
    message: "Acesso liberado à sala de teleconsulta.",
  };
}
