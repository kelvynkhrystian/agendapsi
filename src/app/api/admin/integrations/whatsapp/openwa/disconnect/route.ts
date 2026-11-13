import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { controlOpenWaSession, getWhatsAppCapability } from "@/lib/integrations-whatsapp";
import { handleAdminApiError } from "@/lib/integrations-response";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const cooldown = checkActionCooldown(`openwa-disconnect:${admin.userId}`, 2000);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de desconectar novamente.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const cap = getWhatsAppCapability(sys);

    if (cap.provider !== "OPENWA") {
      return NextResponse.json(
        { error: "Desconexão de sessão só se aplica ao provedor OpenWA." },
        { status: 400 }
      );
    }

    const res = await controlOpenWaSession(cap, "disconnect");
    const now = new Date();

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          whatsappHealthStatus: cap.enabled ? res.healthStatus : "DISABLED",
          whatsappHealthMessage: res.message,
          whatsappLastCheckedAt: now,
          openWaConnectedNumber: null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.userId,
        userRole: "ADMIN",
        action: "OPENWA_SESSION_DISCONNECT",
        resource: "SystemSettings",
        resourceId: sys?.id || "default",
        details: JSON.stringify({ ok: res.ok, healthStatus: res.healthStatus }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    const healthMeta = getHealthStatusMeta(res.healthStatus, cap.enabled, cap.configured);
    return NextResponse.json(
      {
        ok: res.ok,
        healthStatus: res.healthStatus,
        healthMeta,
        message: res.message,
        errorCode: res.errorCode || null,
        checkedAt: now.toISOString(),
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao desconectar sessão OpenWA.");
  }
}
