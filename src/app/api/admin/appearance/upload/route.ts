import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireAdmin } from "@/lib/auth";
import { isRestoreInProgress, RESTORE_MAINTENANCE_MESSAGE } from "@/lib/backup";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    if (await isRestoreInProgress()) {
      return NextResponse.json({ error: RESTORE_MAINTENANCE_MESSAGE }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = formData.get("assetType") as string | null; // "logo", "logoHorizontal", "favicon"

    if (!file || !assetType) {
      return NextResponse.json({ error: "Arquivo ou tipo de asset não fornecido." }, { status: 400 });
    }

    // Validação de tamanho (máximo 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "O arquivo excede o limite máximo permitido de 5 MB." }, { status: 400 });
    }

    // Validação de tipo MIME
    const allowedMimes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json({ error: "Formato inválido. Envie imagem PNG, JPG, WebP, SVG ou ICO." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Salva na pasta de uploads públicos para poder ser referenciado pela UI
    const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type === "image/svg+xml" ? ".svg" : file.type === "image/x-icon" ? ".ico" : ".png");
    const filename = `${assetType}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/branding/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      assetType,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro no upload de asset de identidade visual:", error);
    return NextResponse.json({ error: "Erro interno no upload do arquivo." }, { status: 500 });
  }
}
