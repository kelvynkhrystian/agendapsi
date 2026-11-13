import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getEmailCapability } from "@/lib/integrations-email";
import { getSmsCapability } from "@/lib/integrations-sms";
import { getWhatsAppCapability } from "@/lib/integrations-whatsapp";

function mapHealthToTechnicalStatus(
  enabled: boolean,
  configured: boolean,
  persistedHealthStatus: string | null | undefined,
  lastDelivery?: { status: string; simulated: boolean } | null
): string {
  if (!enabled) return "DISABLED";
  if (!configured) return "MISCONFIGURED";
  switch (persistedHealthStatus) {
    case "CONNECTED":
      return "OPERATIONAL";
    case "INVALID_AUTH":
      return "AUTH_ERROR";
    case "DEVICE_OFFLINE":
      return "DEVICE_OFFLINE";
    case "AWAITING_QR":
    case "RECONNECT_REQUIRED":
      return "AWAITING_PAIRING";
    case "SERVICE_UNAVAILABLE":
    case "CONNECTION_FAILED":
      return "DELIVERY_FAILED";
    case "PARTIAL_API_ONLY":
    case "PARTIAL_SESSION_ONLY":
      return "PARTIAL";
    default:
      break;
  }
  if (lastDelivery) {
    if (lastDelivery.status === "DELIVERED" || lastDelivery.status === "ACCEPTED") {
      return "OPERATIONAL";
    }
    if (lastDelivery.status === "SIMULATED") {
      return "CONFIGURED_SIMULATED";
    }
    if (lastDelivery.status === "FAILED") {
      return "DELIVERY_FAILED";
    }
    return "CONFIGURED";
  }
  return "CONFIGURED_UNTESTED";
}

/**
 * Validação rigorosa de condições para acesso não autenticado de desenvolvimento local.
 * Requer cumulativamente:
 * 1. NODE_ENV === "development" (nunca em produção, mesmo se a variável for configurada)
 * 2. PSI_LOCAL_TECHNICAL_STATUS_PUBLIC === "true" (opt-in explícito)
 * 3. Requisição restrita a loopback (127.0.0.1, localhost, ::1)
 * 4. Ausência de proxy reverso público, túneis (ngrok/Cloudflare) ou origens externas
 */
export function isLocalTechnicalStatusPublicAllowed(req: NextRequest): boolean {
  // 1. Apenas em ambiente de desenvolvimento
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  // 2. Opt-in explícito via variável de ambiente
  if (process.env.PSI_LOCAL_TECHNICAL_STATUS_PUBLIC !== "true") {
    return false;
  }

  // 3. Validação estrita de loopback no Host e URL
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase().trim();
  const urlHostname = req.nextUrl.hostname.toLowerCase().trim();

  const isLoopbackHost =
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "::1" ||
    host === "[::1]";

  const isLoopbackUrl =
    urlHostname === "127.0.0.1" ||
    urlHostname === "localhost" ||
    urlHostname === "::1";

  if (!isLoopbackHost || !isLoopbackUrl) {
    return false;
  }

  // 4. Detecção de proxy reverso ou túneis públicos
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return false; // Bloqueia túneis Cloudflare
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const fHostClean = forwardedHost.split(":")[0].toLowerCase().trim();
    if (fHostClean !== "127.0.0.1" && fHostClean !== "localhost" && fHostClean !== "::1") {
      return false; // Bloqueia proxies com host externo
    }
  }

  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    for (const ip of ips) {
      if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
        return false; // Bloqueia qualquer IP de cliente que não seja loopback
      }
    }
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    const cleanRealIp = realIp.trim();
    if (cleanRealIp !== "127.0.0.1" && cleanRealIp !== "::1" && cleanRealIp !== "::ffff:127.0.0.1") {
      return false;
    }
  }

  return true;
}

export async function GET(req: NextRequest) {
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    // 1. Verificação de Autenticação Segura (Bearer Token de alta entropia ou Sessão ADMIN)
    const authHeader = req.headers.get("authorization");
    const configuredToken = process.env.TECHNICAL_STATUS_BEARER_TOKEN;

    const isBearerValid =
      !!(configuredToken && authHeader && authHeader.trim() === `Bearer ${configuredToken}`);

    let isAdminSession = false;
    if (!isBearerValid) {
      try {
        const session = await getSession();
        if (session && session.role === "ADMIN") {
          isAdminSession = true;
        }
      } catch {
        isAdminSession = false;
      }
    }

    const isAuthenticated = isBearerValid || isAdminSession;

    // 2. Verificação de exceção para desenvolvimento local desautenticado (Phase 4)
    const isPublicLocalAllowed = !isAuthenticated && isLocalTechnicalStatusPublicAllowed(req);

    if (!isAuthenticated && !isPublicLocalAllowed) {
      // Registra tentativa não autorizada no log técnico
      await prisma.technicalAccessLog.create({
        data: {
          endpoint: "/api/technical/status",
          ipAddress,
          userAgent,
          success: false,
        },
      });

      return NextResponse.json(
        { error: "Acesso não autorizado. Bearer token inválido ou ausente." },
        { status: 401 }
      );
    }

    // 3. Coleta paralela e eficiente de métricas agregadas reais
    const [
      admin,
      patientCount,
      appointmentCount,
      serviceCount,
      fileCount,
      fileBytesAgg,
      settings,
      paymentAggregates,
      lastEmailDelivery,
      lastSmsDelivery,
      lastWaDelivery,
    ] = await Promise.all([
      // Dados do administrador apenas são consultados se for acesso autenticado
      isAuthenticated
        ? prisma.adminAccount.findFirst({
            select: {
              name: true,
              email: true,
              phone: true,
              crpCrm: true,
            },
          })
        : Promise.resolve(null),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.service.count(),
      prisma.storedFile.count(),
      prisma.storedFile.aggregate({
        _sum: { sizeBytes: true },
      }),
      prisma.systemSettings.findFirst(),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.notificationDelivery.findFirst({
        where: { channel: "EMAIL" },
        orderBy: { sentAt: "desc" },
        select: { status: true, simulated: true, sentAt: true },
      }),
      prisma.notificationDelivery.findFirst({
        where: { channel: "SMS" },
        orderBy: { sentAt: "desc" },
        select: { status: true, simulated: true, sentAt: true },
      }),
      prisma.notificationDelivery.findFirst({
        where: { channel: "WHATSAPP" },
        orderBy: { sentAt: "desc" },
        select: { status: true, simulated: true, sentAt: true },
      }),
    ]);

    // 4. Registra acesso no log técnico de auditoria
    await prisma.technicalAccessLog.create({
      data: {
        endpoint: "/api/technical/status",
        ipAddress,
        userAgent,
        success: true,
      },
    });

    // 5. Métricas de Armazenamento Real
    const totalFileSizeBytes = fileBytesAgg._sum.sizeBytes || 0;
    const usageMB = Number((totalFileSizeBytes / (1024 * 1024)).toFixed(2));

    let availableDiskSpaceBytes: number | null = null;
    try {
      const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || "storage/uploads");
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      const stats = fs.statfsSync(storageDir);
      availableDiskSpaceBytes = Number(BigInt(stats.bavail) * BigInt(stats.bsize));
    } catch {
      availableDiskSpaceBytes = null;
    }

    // 6. Métricas de Pagamento
    let totalPayments = 0;
    let approvedPayments = 0;
    let pendingPayments = 0;

    for (const group of paymentAggregates) {
      totalPayments += group._count.id;
      if (group.status === "APPROVED") approvedPayments += group._count.id;
      if (group.status === "PENDING") pendingPayments += group._count.id;
    }

    // 7. Diagnóstico Real de Integrações
    const emailCap = getEmailCapability(settings);
    const smsCap = getSmsCapability(settings);
    const waCap = getWhatsAppCapability(settings);

    const emailStatus = mapHealthToTechnicalStatus(
      emailCap.enabled,
      emailCap.configured,
      settings?.emailHealthStatus,
      lastEmailDelivery
    );

    const smsStatus = mapHealthToTechnicalStatus(
      smsCap.enabled,
      smsCap.configured,
      settings?.smsHealthStatus,
      lastSmsDelivery
    );

    const whatsappStatus = mapHealthToTechnicalStatus(
      waCap.enabled,
      waCap.configured,
      settings?.whatsappHealthStatus,
      lastWaDelivery
    );

    const paymentGatewayStatus = settings?.enableOnlinePayment ? "SIMULATED_ACTIVE" : "DISABLED";
    const paymentIntegrationStatus = settings?.enableOnlinePayment ? "ONLINE_SIMULATED" : "MANUAL_IN_PERSON";
    const videoProvider = settings?.activeVideoProvider || "JITSI";

    const applicationVersion = process.env.npm_package_version || "1.0.0";
    const timestamp = new Date().toISOString();

    // 8. SERIALIZAÇÃO SEPARADA CONFORME O TIPO DE ACESSO
    // SE FOR ACESSO NÃO AUTENTICADO DE DESENVOLVIMENTO LOCAL:
    // Retorna exclusivamente o subset higienizado (sem dados de administrador nem identificadores sensíveis)
    if (isPublicLocalAllowed) {
      return NextResponse.json({
        installation: {
          applicationVersion,
          timestamp,
          applicationStatus: "OPERATIONAL",
        },
        storage: {
          totalFileSizeBytes,
          totalFileCount: fileCount,
          usageMB,
          availableDiskSpaceBytes,
        },
        application: {
          totalPatients: patientCount,
          totalAppointments: appointmentCount,
          totalServices: serviceCount,
        },
        integrations: {
          emailStatus,
          smsStatus,
          whatsappStatus,
          paymentGatewayStatus,
          videoProvider,
        },
        payments: {
          totalPayments,
          pendingPayments,
          approvedPayments,
          integrationStatus: paymentIntegrationStatus,
        },
        accessMode: "UNAUTHENTICATED_LOCAL_DEV",
        notice:
          "Modo de desenvolvimento local desautenticado ativo (loopback). Informações de contato do administrador e identificadores de instalação foram omitidos.",
      });
    }

    // SE FOR ACESSO AUTENTICADO (Bearer Token ou ADMIN):
    // Retorna o payload completo incluindo os dados operacionais do administrador
    const installationId = process.env.INSTALLATION_ID || "psi-standalone-instance-default";

    return NextResponse.json({
      installation: {
        applicationVersion,
        installationId,
        timestamp,
        applicationStatus: "OPERATIONAL",
      },
      administrator: {
        name: admin?.name || null,
        email: admin?.email || null,
        phone: admin?.phone || null,
      },
      storage: {
        totalFileSizeBytes,
        totalFileCount: fileCount,
        usageMB,
        availableDiskSpaceBytes,
      },
      application: {
        totalPatients: patientCount,
        totalAppointments: appointmentCount,
        totalServices: serviceCount,
      },
      integrations: {
        emailStatus,
        smsStatus,
        whatsappStatus,
        paymentGatewayStatus,
        videoProvider,
      },
      payments: {
        totalPayments,
        pendingPayments,
        approvedPayments,
        integrationStatus: paymentIntegrationStatus,
      },

      // Campos de retrocompatibilidade para clientes legados
      installationId,
      version: applicationVersion,
      timestamp,
      adminContact: {
        name: admin?.name || "Administrador PSI",
        email: admin?.email || "admin@localhost",
        phone: admin?.phone || "",
        crpCrm: admin?.crpCrm || "",
      },
      patientMetrics: {
        totalPatients: patientCount,
      },
      paymentSubsystem: {
        totalTransactions: totalPayments,
        approvedCount: approvedPayments,
        pendingCount: pendingPayments,
      },
      privacyNotice:
        "Este endpoint técnico é exclusivamente para leitura (PULL) do painel de monitoramento do desenvolvedor. Nenhum dado clínico, anotação de prontuário, senha, token ou identidade individual de pacientes é exposta.",
    });
  } catch (error) {
    console.error("Erro no status técnico:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar métricas de monitoramento técnico." },
      { status: 500 }
    );
  }
}
