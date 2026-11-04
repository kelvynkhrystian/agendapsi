import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  try {
    // 1. Validação estrita do Bearer Token de alta entropia
    const authHeader = req.headers.get("authorization");
    const configuredToken = process.env.TECHNICAL_STATUS_BEARER_TOKEN;

    if (!configuredToken || !authHeader || authHeader !== `Bearer ${configuredToken}`) {
      // Registra tentativa não autorizada na auditoria técnica
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

    // 2. Coleta de dados técnicos e agregados (SEM DADOS CLÍNICOS NEM SENHAS)
    const [
      admin,
      patientCount,
      fileCount,
      totalFileBytes,
      settings,
      paymentAggregates,
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
      prisma.storedFile.count(),
      prisma.storedFile.aggregate({ _sum: { sizeBytes: true } }),
      prisma.systemSettings.findUnique({ where: { id: "default" } }),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    // Registra acesso bem-sucedido
    await prisma.technicalAccessLog.create({
      data: {
        endpoint: "/api/technical/status",
        ipAddress,
        userAgent,
        success: true,
      },
    });

    // Mapeamento dos pagamentos agregados
    let approvedCount = 0;
    let pendingCount = 0;
    let totalTransactions = 0;

    for (const group of paymentAggregates) {
      totalTransactions += group._count.id;
      if (group.status === "APPROVED") approvedCount += group._count.id;
      if (group.status === "PENDING") pendingCount += group._count.id;
    }

    return NextResponse.json({
      installationId: "psi-standalone-instance-default",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      adminContact: {
        name: admin?.name || "Administrador PSI",
        email: admin?.email || "admin@localhost",
        phone: admin?.phone || "",
        crpCrm: admin?.crpCrm || "",
      },
      patientMetrics: {
        totalPatients: patientCount, // Apenas métrica agregada
      },
      storage: {
        fileCount,
        totalBytes: totalFileBytes._sum.sizeBytes || 0,
        diskAvailableBytes: null, // "not available" honesto se não mensurável pelo host
      },
      integrations: {
        whatsapp: {
          configured: !!(settings?.whatsappApiUrl && settings?.whatsappApiToken),
          simulated: !(settings?.whatsappApiUrl && settings?.whatsappApiToken),
        },
        email: {
          configured: !!(settings?.smtpHost && settings?.smtpUser),
          simulated: !(settings?.smtpHost && settings?.smtpUser),
        },
        videoProvider: {
          active: settings?.activeVideoProvider || "JITSI",
          domain: settings?.jitsiDomain || "meet.jit.si",
        },
        gateway: {
          fakeProviderActive: true,
          activeSlotsCount: 0,
        },
      },
      paymentSubsystem: {
        totalTransactions,
        approvedCount,
        pendingCount,
      },
      privacyNotice:
        "Este endpoint técnico é exclusivamente para leitura (PULL) do painel de monitoramento do desenvolvedor. Nenhum dado clínico, anotação de prontuário, senha ou identidade individual de pacientes é exposta.",
    });
  } catch (error) {
    console.error("Erro no status técnico:", error);
    return NextResponse.json({ error: "Erro interno no status técnico." }, { status: 500 });
  }
}
