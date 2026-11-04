import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const pkg = await prisma.appointmentPackage.findUnique({
      where: { id },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
    }

    if (session.role === "PATIENT" && pkg.patientId !== session.userId) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }

    // Transação para rejeitar e liberar holds
    await prisma.$transaction(async (tx) => {
      await tx.appointmentPackage.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
        },
      });

      // Libera horários imediatamente
      await tx.appointmentHold.deleteMany({
        where: { packageId: id },
      });

      // Cancela pagamento pendente
      await tx.payment.updateMany({
        where: { packageId: id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });

      // Auditoria
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          userRole: session.role,
          action: "PACKAGE_REJECTED",
          resource: "AppointmentPackage",
          resourceId: id,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Proposta de pacote recusada. Os horários foram liberados na agenda.",
    });
  } catch (error) {
    console.error("Erro ao recusar pacote:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
