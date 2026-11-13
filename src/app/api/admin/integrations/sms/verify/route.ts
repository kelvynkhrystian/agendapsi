import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { verifySmsConnection } from "@/lib/integrations-sms";
import { handleAdminApiError } from "@/lib/integrations-response";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`verify-sms:${admin.userId}`, 1500);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de verificar o SMS novamente.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const result = await verifySmsConnection(sys);
    const now = new Date();

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          smsHealthStatus: result.healthStatus,
          smsHealthMessage: result.message,
          smsLastCheckedAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "INTEGRATION_SMS_VERIFIED",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({
          ok: result.ok,
          healthStatus: result.healthStatus,
          errorCode: result.errorCode || null,
          deviceOnline: result.selectedDevice?.isOnline ?? null,
          latencyMs: result.latencyMs,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(result.healthStatus, sys?.smsEnabled ?? false);
    const status = result.ok
      ? 200
      : result.healthStatus === "DISABLED" || result.healthStatus === "NOT_CONFIGURED"
      ? 400
      : 502;

    return NextResponse.json(
      {
        ok: result.ok,
        healthStatus: result.healthStatus,
        healthMeta,
        message: result.message,
        devices: result.devices,
        selectedDevice: result.selectedDevice,
        errorCode: result.errorCode || null,
        latencyMs: result.latencyMs,
        checkedAt: now.toISOString(),
      },
      { status }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao verificar conexão SMS TextBee.");
  }
}
