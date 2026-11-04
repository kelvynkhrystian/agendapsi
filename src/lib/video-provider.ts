export interface VideoRoom {
  provider: "JITSI";
  roomName: string;
  entryUrl: string;
  rawMeetingUrl: string;
}

export interface VideoProvider {
  createRoom(appointmentId: string): Promise<VideoRoom>;
}

/**
 * Provedor Jitsi Meet (V1)
 */
export class JitsiVideoProvider implements VideoProvider {
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
