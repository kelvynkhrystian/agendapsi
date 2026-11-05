import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const updateShareSchema = z.object({
  action: z.enum(["REVOKE", "REACTIVATE"]),
  days: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const adminSession = await requireAdmin();
    const { shareId } = await params;
    const body = await req.json();
    const result = updateShareSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, days } = result.data;

    const share = await prisma.storedFileShare.findUnique({
      where: { id: shareId },
      include: { file: true, patient: true },
    });

    if (!share) {
      return NextResponse.json({ error: "Compartilhamento não encontrado." }, { status: 404 });
    }

    if (action === "REVOKE") {
      const updated = await prisma.storedFileShare.update({
        where: { id: shareId },
        data: {
          canDownload: false,
          revokedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "FILE_SHARE_REVOKED",
          resource: "StoredFileShare",
          resourceId: shareId,
          details: JSON.stringify({
            fileId: share.fileId,
            fileName: share.file.originalName,
            patientId: share.patientId,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Acesso do paciente ao documento revogado com sucesso.",
        share: updated,
      });
    }

    if (action === "REACTIVATE") {
      const validityDays = typeof days === "number" ? days : 30;
      const expiresAt = validityDays > 0 ? new Date(Date.now() + validityDays * 86400000) : null;

      const updated = await prisma.storedFileShare.update({
        where: { id: shareId },
        data: {
          canDownload: true,
          revokedAt: null,
          expiresAt,
          sharedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminSession.userId,
          userRole: "ADMIN",
          action: "FILE_SHARE_REACTIVATED",
          resource: "StoredFileShare",
          resourceId: shareId,
          details: JSON.stringify({
            fileId: share.fileId,
            fileName: share.file.originalName,
            patientId: share.patientId,
            validityDays,
          }),
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Acesso reativado com sucesso${validityDays > 0 ? ` por ${validityDays} dias.` : " com prazo indeterminado."}`,
        share: updated,
      });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar compartilhamento:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
