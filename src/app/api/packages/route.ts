import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { intervalsOverlap } from "@/lib/schedule";
import { dispatchNotification } from "@/lib/notifications";

const createPackageSchema = z.object({
  patientId: z.string().min(1, "Paciente é obrigatório"),
  title: z.string().min(2, "Título do pacote é obrigatório"),
  description: z.string().optional(),
  totalPriceCents: z.number().int().min(0),
  serviceId: z.string().min(1, "Serviço base é obrigatório"),
  expiresInDays: z.number().int().min(1).default(2), // expira proposta em 48h por padrão
  slots: z
    .array(
      z.object({
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
        modality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]).default("ONLINE"),
      })
    )
    .min(1, "O pacote deve conter no mínimo 1 horário pré-definido"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const where: Record<string, unknown> = {};

    if (session.role === "PATIENT") {
      where.patientId = session.userId;
    }

    const packages = await prisma.appointmentPackage.findMany({
      where,
      include: {
        patient: { select: { fullName: true, email: true, phone: true } },
        appointments: {
          include: { service: true },
          orderBy: { startAt: "asc" },
        },
        holds: true,
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    console.error("Erro ao buscar pacotes:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const body = await req.json();
    const result = createPackageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;
    const expiresAt = new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000);

    // Validação e criação atômica em transação
    const createdPackage = await prisma.$transaction(async (tx) => {
      // 1. Verifica se algum dos horários colide com agendamentos existentes
      for (const slot of data.slots) {
        const start = new Date(slot.startAt);
        const end = new Date(slot.endAt);

        const conflictingAppt = await tx.appointment.findFirst({
          where: {
            status: { notIn: ["CANCELLED"] },
            startAt: { lt: end },
            endAt: { gt: start },
          },
        });

        if (conflictingAppt) {
          throw new Error(`HORARIO_COLIDE_${slot.startAt}`);
        }
      }

      // 2. Cria o registro do pacote
      const pkg = await tx.appointmentPackage.create({
        data: {
          patientId: data.patientId,
          title: data.title,
          description: data.description,
          totalPriceCents: data.totalPriceCents,
          status: "PROPOSED",
          expiresAt,
        },
      });

      // 3. Cria holds temporários vinculados ao pacote para proteger a agenda
      for (const slot of data.slots) {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await tx.appointmentHold.create({
          data: {
            holdToken: token,
            patientId: data.patientId,
            serviceId: data.serviceId,
            packageId: pkg.id,
            startAt: new Date(slot.startAt),
            endAt: new Date(slot.endAt),
            expiresAt,
            reason: "PACKAGE_PROPOSAL",
          },
        });
      }

      // 4. Cria registro de pagamento pendente
      await tx.payment.create({
        data: {
          packageId: pkg.id,
          patientId: data.patientId,
          amountCents: data.totalPriceCents,
          status: "PENDING",
          method: "ONLINE_SIMULATED",
          isSimulated: true,
        },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "PACKAGE_PROPOSED",
          resource: "AppointmentPackage",
          resourceId: pkg.id,
          details: JSON.stringify({
            title: pkg.title,
            slotsCount: data.slots.length,
            totalPriceCents: pkg.totalPriceCents,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return pkg;
    });

    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (patient) {
      await dispatchNotification({
        recipientId: patient.id,
        recipientRole: "PATIENT",
        eventType: "PACKAGE_AWAITING_ACCEPTANCE",
        targetUrl: "/paciente/financeiro",
        relatedEntityType: "AppointmentPackage",
        relatedEntityId: createdPackage.id,
        vars: {
          patientName: patient.fullName,
          valueCents: data.totalPriceCents,
        },
        idempotencyKey: `pkg-proposed-${createdPackage.id}`,
      });
    }

    return NextResponse.json(createdPackage, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("HORARIO_COLIDE")) {
      return NextResponse.json(
        { error: "Um ou mais horários selecionados colidem com a agenda existente." },
        { status: 409 }
      );
    }
    console.error("Erro ao criar pacote:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
