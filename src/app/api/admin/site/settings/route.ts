import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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
  // Minisite Phase 4/5: Icons, Location & WhatsApp
  benefits: z
    .array(
      z.object({
        id: z.string(),
        icon: z.string(),
        customIconUrl: z.string().nullable().optional(),
        title: z.string(),
        subtitle: z.string().nullable().optional(),
        isVisible: z.boolean().default(true),
        order: z.number().default(1),
      })
    )
    .optional(),
  benefitsJson: z.string().optional(),
  addressNumber: z.string().optional(),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().optional(),
  addressPostalCode: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  googleMapsEmbedUrl: z.string().optional(),
  showLocation: z.boolean().optional(),
  whatsappDefaultMessage: z.string().optional(),
  showFloatingWhatsApp: z.boolean().optional(),
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

    const computedBenefitsJson = data.benefits
      ? JSON.stringify(data.benefits)
      : data.benefitsJson !== undefined
      ? data.benefitsJson
      : undefined;

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
          addressNumber: data.addressNumber,
          addressComplement: data.addressComplement,
          addressNeighborhood: data.addressNeighborhood,
          addressCity: data.addressCity,
          addressState: data.addressState,
          addressPostalCode: data.addressPostalCode,
          googleMapsUrl: data.googleMapsUrl,
          googleMapsEmbedUrl: data.googleMapsEmbedUrl,
          showLocation: data.showLocation ?? true,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          whatsappDefaultMessage: data.whatsappDefaultMessage,
          showFloatingWhatsApp: data.showFloatingWhatsApp ?? true,
          email: data.email,
          instagram: data.instagram,
          ...(computedBenefitsJson !== undefined ? { benefitsJson: computedBenefitsJson } : {}),
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
          addressNumber: data.addressNumber,
          addressComplement: data.addressComplement,
          addressNeighborhood: data.addressNeighborhood,
          addressCity: data.addressCity,
          addressState: data.addressState,
          addressPostalCode: data.addressPostalCode,
          googleMapsUrl: data.googleMapsUrl,
          googleMapsEmbedUrl: data.googleMapsEmbedUrl,
          showLocation: data.showLocation ?? true,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          whatsappDefaultMessage: data.whatsappDefaultMessage,
          showFloatingWhatsApp: data.showFloatingWhatsApp ?? true,
          email: data.email,
          instagram: data.instagram,
          benefitsJson: computedBenefitsJson || null,
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
