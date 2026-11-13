import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { fetchOpenWaQrCode, getWhatsAppCapability } from "@/lib/integrations-whatsapp";
import { handleAdminApiError } from "@/lib/integrations-response";

async function handleGetQr(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`openwa-qr:${admin.userId}`, 1200);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de consultar o QR Code novamente.` },
        { status: 429 }
      );
    }

    const sys = await prisma.systemSettings.findFirst();
    const cap = getWhatsAppCapability(sys);

    if (cap.provider !== "OPENWA") {
      return NextResponse.json(
        { error: "O QR Code está disponível apenas quando o provedor OpenWA estiver selecionado e salvo." },
        { status: 400 }
      );
    }

    const res = await fetchOpenWaQrCode(cap);
    const now = new Date();

    if (sys) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          whatsappHealthStatus: cap.enabled ? res.healthStatus : "DISABLED",
          whatsappHealthMessage: res.message,
          whatsappLastCheckedAt: now,
          ...(res.connected && res.connectedNumber
            ? { openWaConnectedNumber: res.connectedNumber }
            : {}),
        },
      });
    }

    const healthMeta = getHealthStatusMeta(res.healthStatus, cap.enabled, cap.configured);
    return NextResponse.json(
      {
        ok: res.ok,
        healthStatus: res.healthStatus,
        healthMeta,
        qrCodeDataUri: res.qrCodeDataUri,
        connected: res.connected,
        connectedNumber: res.connectedNumber,
        message: res.message,
        errorCode: res.errorCode || null,
        checkedAt: now.toISOString(),
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao obter QR Code da sessão OpenWA.");
  }
}

export const GET = handleGetQr;
export const POST = handleGetQr;
