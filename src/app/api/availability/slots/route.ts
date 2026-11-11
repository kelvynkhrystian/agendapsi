import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailableSlotsForDate } from "@/lib/schedule";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // "YYYY-MM-DD"
    const serviceId = searchParams.get("serviceId");
    const excludeAppointmentId = searchParams.get("excludeAppointmentId") || undefined;
    const forAdmin = searchParams.get("forAdmin") === "true";

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: "Parâmetros 'date' e 'serviceId' são obrigatórios." },
        { status: 400 }
      );
    }

    const [session, settings] = await Promise.all([
      forAdmin || excludeAppointmentId ? getSession() : Promise.resolve(null),
      prisma.systemSettings.findUnique({
        where: { id: "default" },
        select: { timezone: true },
      }),
    ]);

    const isAdminRequest = session?.role === "ADMIN";

    const slots = await getAvailableSlotsForDate({
      dateStr,
      serviceId,
      timezone: settings?.timezone || "America/Sao_Paulo",
      excludeAppointmentId: isAdminRequest ? excludeAppointmentId : undefined,
      respectMinNotice: !(forAdmin && isAdminRequest),
    });

    return NextResponse.json(slots);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "DATA_INVALIDA") {
      return NextResponse.json(
        { error: "Formato de data inválido. Utilize YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "SERVICO_INATIVO_OU_INEXISTENTE") {
      return NextResponse.json(
        { error: "Serviço solicitado não está disponível." },
        { status: 404 }
      );
    }
    console.error("Erro ao calcular slots disponíveis:", error);
    return NextResponse.json({ error: "Erro ao calcular horários." }, { status: 500 });
  }
}
