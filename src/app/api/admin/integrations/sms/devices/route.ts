import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { decryptSecret } from "@/lib/secrets";
import { checkActionCooldown, getHealthStatusMeta } from "@/lib/integrations-health";
import { listTextBeeDevices, resolveTextBeeHostingMode } from "@/lib/integrations-sms";
import { handleAdminApiError } from "@/lib/integrations-response";

const devicesQuerySchema = z.object({
  hostingMode: z.enum(["CLOUD", "SELF_HOSTED"]).optional(),
  apiUrl: z.string().trim().max(500).optional().nullable(),
  apiKey: z.string().max(512).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const cooldown = checkActionCooldown(`sms-devices:${admin.userId}`, 1200);
    if (!cooldown.allowed) {
      return NextResponse.json(
        { error: `Aguarde ${cooldown.retryAfterSeconds}s antes de buscar dispositivos novamente.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = devicesQuerySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos para consulta de dispositivos." }, { status: 400 });
    }

    const sys = await prisma.systemSettings.findFirst();
    const hostingMode = parsed.data.hostingMode || resolveTextBeeHostingMode(sys?.textbeeHostingMode);
    const customApiUrl =
      parsed.data.apiUrl !== undefined ? parsed.data.apiUrl : sys?.textbeeApiUrl || null;

    const effectiveApiKey =
      parsed.data.apiKey && parsed.data.apiKey.trim() !== ""
        ? parsed.data.apiKey.trim()
        : decryptSecret(sys?.textbeeApiKey) || "";

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: "Informe ou salve a API Key do TextBee antes de buscar os dispositivos." },
        { status: 400 }
      );
    }

    const result = await listTextBeeDevices({
      hostingMode,
      customApiUrl,
      apiKey: effectiveApiKey,
    });

    const now = new Date();
    const usedStoredConfig =
      !parsed.data.apiKey?.trim() &&
      hostingMode === resolveTextBeeHostingMode(sys?.textbeeHostingMode) &&
      (customApiUrl || null) === (sys?.textbeeApiUrl || null);

    if (sys && usedStoredConfig) {
      await prisma.systemSettings.update({
        where: { id: sys.id },
        data: {
          smsHealthStatus: sys.smsEnabled ? result.healthStatus : "DISABLED",
          smsHealthMessage: result.message,
          smsLastCheckedAt: now,
        },
      });
    }

    const healthMeta = getHealthStatusMeta(result.healthStatus);
    const status = result.ok ? 200 : result.healthStatus === "INVALID_AUTH" ? 401 : 502;

    return NextResponse.json(
      {
        ok: result.ok,
        devices: result.devices,
        healthStatus: result.healthStatus,
        healthMeta,
        message: result.message,
        errorCode: result.errorCode || null,
        checkedAt: now.toISOString(),
      },
      { status }
    );
  } catch (error: unknown) {
    return handleAdminApiError(error, "Erro ao buscar dispositivos TextBee.");
  }
}
