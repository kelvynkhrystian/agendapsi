import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getDecryptedGatewayCredentials } from "@/lib/payments/registry";
import { PaymentProviderKey } from "@/lib/payments/types";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const { provider } = await params;
    const providerKey = provider.toUpperCase() as PaymentProviderKey;

    let gatewayData = await getDecryptedGatewayCredentials(providerKey);

    // Permite testar credenciais passadas diretamente no body sem precisar salvar antes
    const body = await req.json().catch(() => ({}));
    let credsToTest = gatewayData?.credentials || {};

    if (body && Object.keys(body).length > 0) {
      credsToTest = {
        ...credsToTest,
        ...(body.accessToken ? { accessToken: body.accessToken } : {}),
        ...(body.apiKey ? { apiKey: body.apiKey } : {}),
        ...(body.token ? { token: body.token } : {}),
        ...(body.publicKey ? { publicKey: body.publicKey } : {}),
      };
    }

    const providerImpl = getPaymentProvider(providerKey);
    const env = body.environment || gatewayData?.environment || "SANDBOX";

    const testResult = await providerImpl.testConnection(credsToTest, env);

    // Atualiza status no banco de dados
    await prisma.gatewayConfiguration.update({
      where: { providerKey },
      data: {
        healthStatus: testResult.success ? "CONNECTED" : "ERROR",
        healthMessage: testResult.message,
        lastTestedAt: new Date(),
        lastCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      details: testResult.details,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no teste de conexão de pagamento:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno ao testar conexão." },
      { status: 500 }
    );
  }
}
