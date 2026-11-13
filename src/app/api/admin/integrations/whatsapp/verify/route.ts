import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { verifyWhatsAppConnection } from "@/lib/integrations-whatsapp";
import { handleAdminApiError } from "@/lib/integrations-response";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`verify-wa:${admin.userId}`, 1500);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de verificar o WhatsApp novamente.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const result = await verifyWhatsAppConnection(sys);
    const now = new Date();

    if (sys) {
      const extraUpdates: Record<string, unknown> = {};
      if (result.provider === "OPENWA") {
        if (result.healthStatus === "CONNECTED" && result.displayPhone) {
          extraUpdates.openWaConnectedNumber = result.displayPhone;
        } else if (
          result.healthStatus === "AWAITING_QR" ||
          result.healthStatus === "RECONNECT_REQUIRED" ||
          result.healthStatus === "CONNECTION_FAILED"
        ) {
          extraUpdates.openWaConnectedNumber = null;
        }
      }

      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          whatsappHealthStatus: result.healthStatus,
          whatsappHealthMessage: result.message,
          whatsappLastCheckedAt: now,
          ...extraUpdates,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "INTEGRATION_WHATSAPP_VERIFIED",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({
          ok: result.ok,
          provider: result.provider,
          healthStatus: result.healthStatus,
          errorCode: result.errorCode || null,
          latencyMs: result.latencyMs,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(result.healthStatus, sys?.whatsappEnabled ?? false);
    const status = result.ok
      ? 200
      : result.healthStatus === "DISABLED" || result.healthStatus === "NOT_CONFIGURED"
      ? 400
      : 502;

    return NextResponse.json(
      {
        ok: result.ok,
        provider: result.provider,
        healthStatus: result.healthStatus,
        healthMeta,
        message: result.message,
        displayPhone: result.displayPhone || null,
        verifiedName: result.verifiedName || null,
        qrCodeDataUri: result.qrCodeDataUri || null,
        sessionState: result.sessionState || null,
        errorCode: result.errorCode || null,
        latencyMs: result.latencyMs,
        checkedAt: now.toISOString(),
      },
      { status }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao verificar conexão do WhatsApp.");
  }
}
