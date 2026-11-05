import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".svg": "image/svg+xml",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;

    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: "Caminho não informado." }, { status: 400 });
    }

    const slot = segments[0];
    const ALLOWED_SLOTS = ["top", "sobre"];
    if (!ALLOWED_SLOTS.includes(slot)) {
      return NextResponse.json({ error: "Slot de mídia não permitido." }, { status: 403 });
    }

    // Proteção rigorosa contra Path Traversal
    for (const seg of segments) {
      if (seg.includes("..") || seg.includes("/") || seg.includes("\\")) {
        return NextResponse.json({ error: "Acesso inválido ao sistema de arquivos (Path Traversal)." }, { status: 403 });
      }
    }

    const baseDir = path.resolve(process.cwd(), "storage", "minisite");
    const sanitizedSegments = segments.map((s) => path.basename(s));
    const targetPath = path.resolve(baseDir, ...sanitizedSegments);

    if (!targetPath.startsWith(baseDir)) {
      return NextResponse.json({ error: "Acesso inválido ao sistema de arquivos." }, { status: 403 });
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Arquivo de mídia não encontrado." }, { status: 404 });
    }

    const stat = fs.statSync(targetPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "O recurso requisitado não é um arquivo." }, { status: 400 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    const fileStream = fs.createReadStream(targetPath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Erro ao servir mídia do minisite:", error);
    return NextResponse.json({ error: "Erro interno ao servir arquivo de mídia." }, { status: 500 });
  }
}
