import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { verifyEmailConnection } from "@/lib/integrations-email";
import { handleAdminApiError } from "@/lib/integrations-response";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`verify-email:${admin.userId}`, 1500);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de verificar o e-mail novamente.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const result = await verifyEmailConnection(sys);
    const now = new Date();

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          emailHealthStatus: result.healthStatus,
          emailHealthMessage: result.message,
          emailLastCheckedAt: now,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "INTEGRATION_EMAIL_VERIFIED",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({
          ok: result.ok,
          healthStatus: result.healthStatus,
          errorCode: result.errorCode || null,
          latencyMs: result.latencyMs,
        }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(result.healthStatus, sys?.smtpEnabled ?? false);
    const httpStatus = result.ok ? 200 : result.healthStatus === "DISABLED" || result.healthStatus === "NOT_CONFIGURED" ? 400 : 502;

    return NextResponse.json(
      {
        ok: result.ok,
        healthStatus: result.healthStatus,
        healthMeta,
        message: result.message,
        errorCode: result.errorCode || null,
        latencyMs: result.latencyMs,
        checkedAt: now.toISOString(),
      },
      { status: httpStatus }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao verificar conexão SMTP.");
  }
}
