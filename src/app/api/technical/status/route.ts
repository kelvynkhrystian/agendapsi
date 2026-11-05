import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    // 1. Validação de Autenticação Segura (Bearer Token técnico de alta entropia ou Sessão ADMIN)
    const authHeader = req.headers.get("authorization");
    const configuredToken = process.env.TECHNICAL_STATUS_BEARER_TOKEN;

    const isBearerValid =
      configuredToken && authHeader && authHeader.trim() === `Bearer ${configuredToken}`;

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

    if (!isBearerValid && !isAdminSession) {
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

    // 2. Coleta paralela e eficiente de métricas agregadas reais (sem varredura pesada nem dados clínicos)
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
      lastWaDelivery,
    ] = await Promise.all([
      prisma.adminAccount.findFirst({
        select: {
          name: true,
          email: true,
          phone: true,
          crpCrm: true,
        },
      }),
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
        where: { channel: "WHATSAPP" },
        orderBy: { sentAt: "desc" },
        select: { status: true, simulated: true, sentAt: true },
      }),
    ]);

    // 3. Registra acesso bem-sucedido na auditoria técnica
    await prisma.technicalAccessLog.create({
      data: {
        endpoint: "/api/technical/status",
        ipAddress,
        userAgent,
        success: true,
      },
    });

    // 4. Cálculo real de armazenamento físico e espaço em disco
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
      availableDiskSpaceBytes = null; // Explicitamente null quando o host não permite mensuração
    }

    // 5. Mapeamento de métricas agregadas de pagamentos reais
    let totalPayments = 0;
    let approvedPayments = 0;
    let pendingPayments = 0;

    for (const group of paymentAggregates) {
      totalPayments += group._count.id;
      if (group.status === "APPROVED") approvedPayments += group._count.id;
      if (group.status === "PENDING") pendingPayments += group._count.id;
    }

    // 6. Diagnóstico real de integrações (sem assumir operacionalidade apenas pela presença de variáveis)
    // Email Status
    let emailStatus = "DISABLED";
    if (settings?.smtpEnabled) {
      if (!settings?.smtpHost || !settings?.smtpUser) {
        emailStatus = "MISCONFIGURED";
      } else if (lastEmailDelivery) {
        if (lastEmailDelivery.status === "DELIVERED") {
          emailStatus = "OPERATIONAL";
        } else if (lastEmailDelivery.status === "SIMULATED") {
          emailStatus = "CONFIGURED_SIMULATED";
        } else if (lastEmailDelivery.status === "FAILED") {
          emailStatus = "DELIVERY_FAILED";
        } else {
          emailStatus = "CONFIGURED";
        }
      } else {
        emailStatus = "CONFIGURED_UNTESTED";
      }
    }

    // WhatsApp Status
    let whatsappStatus = "DISABLED";
    if (settings?.whatsappEnabled) {
      if (!settings?.whatsappApiUrl || !settings?.whatsappApiToken) {
        whatsappStatus = "MISCONFIGURED";
      } else if (lastWaDelivery) {
        if (lastWaDelivery.status === "DELIVERED") {
          whatsappStatus = "OPERATIONAL";
        } else if (lastWaDelivery.status === "SIMULATED") {
          whatsappStatus = "CONFIGURED_SIMULATED";
        } else {
          whatsappStatus = "CONFIGURED";
        }
      } else {
        whatsappStatus = "CONFIGURED_UNTESTED";
      }
    }

    // Payment Gateway Status
    const paymentGatewayStatus = settings?.enableOnlinePayment ? "SIMULATED_ACTIVE" : "DISABLED";
    const paymentIntegrationStatus = settings?.enableOnlinePayment ? "ONLINE_SIMULATED" : "MANUAL_IN_PERSON";

    // Provedor de vídeo ativo
    const videoProvider = settings?.activeVideoProvider || "JITSI";

    // Versão da aplicação e identificador da instalação
    const applicationVersion = process.env.npm_package_version || "1.0.0";
    const installationId = process.env.INSTALLATION_ID || "psi-standalone-instance-default";
    const timestamp = new Date().toISOString();

    // 7. Resposta Estruturada por Grupos de Domínio
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

      // Retrocompatibilidade para clientes e testes legados
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
