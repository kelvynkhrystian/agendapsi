import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sanitizeSvgMarkup } from "@/lib/minisite-icons";
import fs from "fs/promises";
import path from "path";

const MAX_ICON_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    if (file.size > MAX_ICON_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo permitido de 2MB." },
        { status: 400 }
      );
    }

    const rawExt = path.extname(file.name).toLowerCase();
    if (![".svg", ".png"].includes(rawExt)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie arquivos nos formatos PNG ou SVG." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let finalBuffer = buffer;

    if (rawExt === ".png") {
      // Validação de magic bytes para PNG (89 50 4E 47)
      if (
        buffer.length < 8 ||
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
      ) {
        return NextResponse.json({ error: "Arquivo PNG corrompido ou inválido." }, { status: 400 });
      }
    } else if (rawExt === ".svg") {
      try {
        const text = buffer.toString("utf-8");
        const sanitized = sanitizeSvgMarkup(text);
        finalBuffer = Buffer.from(sanitized, "utf-8");
      } catch (e: any) {
        return NextResponse.json(
          { error: `Erro na validação do SVG: ${e.message}` },
          { status: 400 }
        );
      }
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "icons");
    await fs.mkdir(uploadDir, { recursive: true });

    const safeName = `icon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${rawExt}`;
    const destinationPath = path.join(uploadDir, safeName);

    await fs.writeFile(destinationPath, finalBuffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/icons/${safeName}`,
      message: "Ícone personalizado enviado com sucesso!",
    });
  } catch (error: any) {
    if (error?.message?.includes("Não autorizado") || error?.message?.includes("Token")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 });
    }
    console.error("Erro no upload de ícone:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar o upload do ícone." },
      { status: 500 }
    );
  }
}
