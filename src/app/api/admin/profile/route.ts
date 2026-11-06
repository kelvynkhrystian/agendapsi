import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeWhatsAppNumber } from "@/lib/phone-utils";
import packageJson from "../../../../../package.json";

const profileSettingsSchema = z.object({
  // Seção A — Dados da Aplicação
  clinicName: z.string().min(2, "O nome do consultório/aplicação deve ter pelo menos 2 caracteres."),
  tagline: z.string().optional().default(""),

  // Seção B — Dados do Administrador / Profissional
  fullName: z.string().min(2, "O nome completo do profissional deve ter pelo menos 2 caracteres."),
  displayName: z.string().optional().nullable(),
  crpCrm: z.string().optional().nullable(),
  title: z.string().optional().nullable(),

  // Seção C — Contatos e Redes Sociais
  whatsappNumber: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("E-mail de contato público inválido.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  instagram: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const adminSession = await requireAdmin();

    const [site, profile, adminAccount] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
      prisma.adminAccount.findFirst({
        orderBy: { createdAt: "asc" },
        select: { email: true, name: true, phone: true, crpCrm: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      application: {
        clinicName: site?.clinicName || "Consultório de Psicologia & Psiquiatria",
        tagline: site?.tagline || "Atendimento ético, acolhedor e humanizado.",
        appVersion: packageJson.version || "1.0.0",
      },
      professional: {
        fullName: profile?.fullName || adminAccount?.name || "Dr(a). Profissional PSI",
        displayName: profile?.displayName || profile?.fullName || adminAccount?.name || "Dr(a). Profissional PSI",
        crpCrm: profile?.crpCrm || adminAccount?.crpCrm || "",
        title: profile?.title || "Psicólogo(a) Clínico(a)",
        adminEmail: adminAccount?.email || adminSession.email,
      },
      contact: {
        whatsappNumber: site?.whatsappNumber || adminAccount?.phone || "",
        phone: site?.phone || "",
        email: site?.email || "",
        instagram: site?.instagram || "",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar dados de perfil:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const parsed = profileSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedWhatsApp = normalizeWhatsAppNumber(data.whatsappNumber);

    // Formata o Instagram sem o arroba duplicado se informado
    let cleanInstagram = data.instagram ? data.instagram.trim() : "";
    if (cleanInstagram.startsWith("@")) {
      cleanInstagram = cleanInstagram.substring(1);
    }

    const [updatedSite, updatedProfile] = await prisma.$transaction([
      prisma.siteSettings.upsert({
        where: { id: "default" },
        update: {
          clinicName: data.clinicName.trim(),
          tagline: (data.tagline || "").trim(),
          whatsappNumber: normalizedWhatsApp || null,
          phone: (data.phone || "").trim() || null,
          email: (data.email || "").trim() || null,
          instagram: cleanInstagram ? `@${cleanInstagram}` : null,
        },
        create: {
          id: "default",
          clinicName: data.clinicName.trim(),
          tagline: (data.tagline || "").trim(),
          aboutText: "",
          heroTitle: "Cuidando da sua saúde mental com excelência",
          heroSubtitle: "Agende sua consulta presencial ou online com praticidade e total sigilo.",
          whatsappNumber: normalizedWhatsApp || null,
          phone: (data.phone || "").trim() || null,
          email: (data.email || "").trim() || null,
          instagram: cleanInstagram ? `@${cleanInstagram}` : null,
        },
      }),

      prisma.professionalProfile.upsert({
        where: { id: "default" },
        update: {
          fullName: data.fullName.trim(),
          displayName: (data.displayName || "").trim() || null,
          crpCrm: (data.crpCrm || "").trim() || "CRP",
          title: (data.title || "").trim() || "Psicólogo(a) Clínico(a)",
        },
        create: {
          id: "default",
          fullName: data.fullName.trim(),
          displayName: (data.displayName || "").trim() || null,
          crpCrm: (data.crpCrm || "").trim() || "CRP",
          title: (data.title || "").trim() || "Psicólogo(a) Clínico(a)",
          bio: "",
        },
      }),
    ]);

    // Opcionalmente atualiza o nome exibido na conta de admin sem alterar e-mail ou senha
    const firstAdmin = await prisma.adminAccount.findFirst({
      orderBy: { createdAt: "asc" },
    });
    if (firstAdmin) {
      await prisma.adminAccount.update({
        where: { id: firstAdmin.id },
        data: {
          name: data.fullName.trim(),
          ...(data.crpCrm ? { crpCrm: data.crpCrm.trim() } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      application: {
        clinicName: updatedSite.clinicName,
        tagline: updatedSite.tagline,
        appVersion: packageJson.version || "1.0.0",
      },
      professional: {
        fullName: updatedProfile.fullName,
        displayName: updatedProfile.displayName || updatedProfile.fullName,
        crpCrm: updatedProfile.crpCrm,
        title: updatedProfile.title,
        adminEmail: firstAdmin?.email || "",
      },
      contact: {
        whatsappNumber: updatedSite.whatsappNumber || "",
        phone: updatedSite.phone || "",
        email: updatedSite.email || "",
        instagram: updatedSite.instagram || "",
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar dados de perfil:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
