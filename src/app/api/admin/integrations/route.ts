import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown } from "@/lib/integrations-health";
import { getEmailCapability, verifyEmailConnection } from "@/lib/integrations-email";
import { getSmsCapability, verifySmsConnection } from "@/lib/integrations-sms";
import { getWhatsAppCapability, verifyWhatsAppConnection } from "@/lib/integrations-whatsapp";
import { buildIntegrationSnapshot, handleAdminApiError } from "@/lib/integrations-response";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const shouldRefresh = req.nextUrl.searchParams.get("refresh") === "1";

    let sys = await prisma.systemSettings.findFirst();

    if (shouldRefresh && sys) {
      const cooldown = checkActionCooldown(`passive-refresh:${admin.userId}`, 4000);
      if (cooldown.allowed) {
        const emailCap = getEmailCapability(sys);
        const smsCap = getSmsCapability(sys);
        const waCap = getWhatsAppCapability(sys);

        const updates: Record<string, unknown> = {};
        const now = new Date();

        const [emailProbe, smsProbe, waProbe] = await Promise.all([
          emailCap.enabled && emailCap.configured ? verifyEmailConnection(sys) : Promise.resolve(null),
          smsCap.enabled && smsCap.configured ? verifySmsConnection(sys) : Promise.resolve(null),
          waCap.enabled && waCap.configured ? verifyWhatsAppConnection(sys) : Promise.resolve(null),
        ]);

        if (emailProbe) {
          updates.emailHealthStatus = emailProbe.healthStatus;
          updates.emailHealthMessage = emailProbe.message;
          updates.emailLastCheckedAt = now;
        }
        if (smsProbe) {
          updates.smsHealthStatus = smsProbe.healthStatus;
          updates.smsHealthMessage = smsProbe.message;
          updates.smsLastCheckedAt = now;
        }
        if (waProbe) {
          updates.whatsappHealthStatus = waProbe.healthStatus;
          updates.whatsappHealthMessage = waProbe.message;
          updates.whatsappLastCheckedAt = now;
          if (waProbe.provider === "OPENWA") {
            if (waProbe.healthStatus === "CONNECTED" && waProbe.displayPhone) {
              updates.openWaConnectedNumber = waProbe.displayPhone;
            } else if (
              waProbe.healthStatus === "AWAITING_QR" ||
              waProbe.healthStatus === "RECONNECT_REQUIRED" ||
              waProbe.healthStatus === "CONNECTION_FAILED"
            ) {
              updates.openWaConnectedNumber = null;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          sys = await prisma.systemSettings.update({
            where: { id: sys.id },
            data: updates,
          });
        }
      }
    }

    const [totalActivePatients, smsOptInPatientsCount] = await Promise.all([
      prisma.patient.count({ where: { isActive: true } }),
      prisma.patient.count({ where: { isActive: true, smsOptIn: true } }),
    ]);

    return NextResponse.json(
      buildIntegrationSnapshot(sys, {
        req,
        totalActivePatients,
        smsOptInPatientsCount,
      })
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao obter integrações.");
  }
}
