import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sanitizeCustomHtml } from "@/lib/sanitize";

const siteSettingsSchema = z.object({
  clinicName: z.string().min(2),
  tagline: z.string().optional(),
  heroTitle: z.string().min(2),
  heroSubtitle: z.string().optional(),
  aboutText: z.string().optional(),
  primaryColor: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().optional(),
  instagram: z.string().optional(),
  customHtml: z.string().optional(),
  // Professional Profile
  professionalName: z.string().min(2).optional(),
  professionalTitle: z.string().optional(),
  crpCrm: z.string().optional(),
  bio: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const result = siteSettingsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Sanitização de HTML customizado
    const sanitizedHtml = sanitizeCustomHtml(data.customHtml);

    const [updatedSite, updatedProfile] = await prisma.$transaction([
      prisma.siteSettings.upsert({
        where: { id: "default" },
        update: {
          clinicName: data.clinicName,
          tagline: data.tagline,
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle,
          aboutText: data.aboutText,
          primaryColor: data.primaryColor || "#0d9488",
          address: data.address,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          email: data.email,
          instagram: data.instagram,
          customHtml: sanitizedHtml,
        },
        create: {
          id: "default",
          clinicName: data.clinicName,
          tagline: data.tagline || "",
          heroTitle: data.heroTitle,
          heroSubtitle: data.heroSubtitle || "",
          aboutText: data.aboutText || "",
          primaryColor: data.primaryColor || "#0d9488",
          address: data.address,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          email: data.email,
          instagram: data.instagram,
          customHtml: sanitizedHtml,
        },
      }),

      prisma.professionalProfile.upsert({
        where: { id: "default" },
        update: {
          fullName: data.professionalName || "Profissional PSI",
          title: data.professionalTitle || "Psicólogo(a)",
          crpCrm: data.crpCrm || "",
          bio: data.bio || "",
        },
        create: {
          id: "default",
          fullName: data.professionalName || "Profissional PSI",
          title: data.professionalTitle || "Psicólogo(a)",
          crpCrm: data.crpCrm || "",
          bio: data.bio || "",
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      site: updatedSite,
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar configurações do site:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
