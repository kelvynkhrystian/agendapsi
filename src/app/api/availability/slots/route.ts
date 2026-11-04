import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlotsForDate } from "@/lib/schedule";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date"); // "YYYY-MM-DD"
    const serviceId = searchParams.get("serviceId");

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: "Parâmetros 'date' e 'serviceId' são obrigatórios." },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlotsForDate({
      dateStr,
      serviceId,
    });

    return NextResponse.json(slots);
  } catch (error: unknown) {
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
