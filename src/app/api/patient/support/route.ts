import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";
import { buildWhatsAppLink, normalizeWhatsAppNumber } from "@/lib/phone-utils";

export async function GET() {
  try {
    await requirePatient();

    const site = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        whatsappNumber: true,
        phone: true,
        clinicName: true,
      },
    });

    const rawNumber = site?.whatsappNumber || site?.phone || null;
    const normalized = normalizeWhatsAppNumber(rawNumber);

    const defaultMessage =
      "Olá! Estou acessando o Portal do Paciente e gostaria de falar com o suporte sobre o uso da plataforma.";

    const supportUrl = normalized ? buildWhatsAppLink(normalized, defaultMessage) : null;

    return NextResponse.json({
      configured: Boolean(supportUrl),
      whatsappNumber: normalized || null,
      defaultMessage,
      supportUrl,
      clinicName: site?.clinicName || "Consultório",
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao paciente autenticado." }, { status: 403 });
    }
    console.error("Erro ao obter dados de suporte do paciente:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
