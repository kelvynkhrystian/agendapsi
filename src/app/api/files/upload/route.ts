import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "PATIENT_DOCUMENT";
    const patientId = formData.get("patientId") as string | null;
    const shareDays = formData.get("shareDays") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O tamanho do arquivo excede o limite máximo permitido de 25 MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Formato de arquivo não permitido. Apenas PDFs, imagens e documentos Word são aceitos." },
        { status: 400 }
      );
    }

    // Sanitiza nome original para evitar path traversal
    const originalName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(originalName) || ".dat";
    const storedFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 12)}${ext}`;

    const storageDir = process.env.STORAGE_DIR || "./storage/uploads";
    await fs.mkdir(storageDir, { recursive: true });

    const targetPath = path.join(storageDir, storedFileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    // Registra no banco
    const storedFile = await prisma.storedFile.create({
      data: {
        originalName,
        storedFileName,
        mimeType: file.type,
        sizeBytes: file.size,
        category,
        uploadedBy: adminSession.userId,
      },
    });

    // Se foi especificado paciente para compartilhamento imediato
    if (patientId) {
      const days = shareDays ? parseInt(shareDays, 10) : 30;
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000) : null;

      await prisma.storedFileShare.create({
        data: {
          fileId: storedFile.id,
          patientId,
          expiresAt,
        },
      });
    }

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "FILE_UPLOADED",
        resource: "StoredFile",
        resourceId: storedFile.id,
        details: JSON.stringify({ originalName, sizeBytes: file.size, category }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      file: storedFile,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no upload de arquivo:", error);
    return NextResponse.json({ error: "Erro ao processar arquivo." }, { status: 500 });
  }
}
