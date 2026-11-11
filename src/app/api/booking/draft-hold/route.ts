import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAtomicHold } from "@/lib/schedule";
import { getSession } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

const draftHoldSchema = z.object({
  serviceId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  holdToken: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }
    const body = await req.json();
    const result = draftHoldSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { serviceId, startAt, endAt, holdToken } = result.data;
    const session = await getSession();

    const hold = await createAtomicHold({
      serviceId,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      patientId: session?.role === "PATIENT" ? session.userId : undefined,
      holdToken,
      holdExpiryMinutes: 60,
      reason: "BOOKING_DRAFT",
    });

    return NextResponse.json({
      success: true,
      holdToken: hold.holdToken,
      expiresAt: hold.expiresAt,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "HORARIO_JA_OCUPADO") {
        return NextResponse.json(
          { error: "Este horário acabou de ser agendado por outro paciente." },
          { status: 409 }
        );
      }
      if (error.message === "HORARIO_EM_RESERVA") {
        return NextResponse.json(
          { error: "Este horário está em processo de reserva por outro paciente no momento." },
          { status: 409 }
        );
      }
    }
    console.error("Erro ao criar hold de agendamento:", error);
    return NextResponse.json({ error: "Erro ao reservar horário." }, { status: 500 });
  }
}
