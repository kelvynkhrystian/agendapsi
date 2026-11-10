import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizeWhatsAppNumber } from "@/lib/phone-utils";
import packageJson from "../../../../../package.json";

const applicationSectionSchema = z.object({
  section: z.literal("application"),
  clinicName: z.string().min(2, "O nome do consultório/aplicação deve ter pelo menos 2 caracteres."),
  tagline: z.string().optional().default(""),
});

const professionalSectionSchema = z.object({
  section: z.literal("professional"),
  fullName: z.string().min(2, "O nome completo do profissional deve ter pelo menos 2 caracteres."),
  displayName: z.string().optional().nullable(),
  crpCrm: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
});

const contactSectionSchema = z.object({
  section: z.literal("contact"),
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

const profileSettingsSchema = z.object({
  section: z.literal("all").optional().default("all"),
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

function formatInstagramHandle(instagram?: string | null): string | null {
  let cleanInstagram = instagram ? instagram.trim() : "";
  if (cleanInstagram.startsWith("@")) {
    cleanInstagram = cleanInstagram.substring(1);
  }
  return cleanInstagram ? `@${cleanInstagram}` : null;
}

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
    const adminSession = await requireAdmin();
    const body = await req.json();
    const section = typeof body?.section === "string" ? body.section : "all";

    let message = "Perfil e configurações salvos com sucesso.";

    if (section === "application") {
      const parsed = applicationSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const data = parsed.data;
      await prisma.siteSettings.upsert({
        where: { id: "default" },
        update: {
          clinicName: data.clinicName.trim(),
          tagline: (data.tagline || "").trim(),
        },
        create: {
          id: "default",
          clinicName: data.clinicName.trim(),
          tagline: (data.tagline || "").trim(),
          aboutText: "",
          heroTitle: "Cuidando da sua saúde mental com excelência",
          heroSubtitle: "Agende sua consulta presencial ou online com praticidade e total sigilo.",
        },
      });
      message = "Dados da aplicação atualizados com sucesso.";
    } else if (section === "professional") {
      const parsed = professionalSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const data = parsed.data;
      await prisma.professionalProfile.upsert({
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
      });

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
      message = "Dados do profissional atualizados com sucesso.";
    } else if (section === "contact") {
      const parsed = contactSectionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const data = parsed.data;
      const normalizedWhatsApp = normalizeWhatsAppNumber(data.whatsappNumber);
      const formattedInstagram = formatInstagramHandle(data.instagram);

      await prisma.siteSettings.upsert({
        where: { id: "default" },
        update: {
          whatsappNumber: normalizedWhatsApp || null,
          phone: (data.phone || "").trim() || null,
          email: (data.email || "").trim() || null,
          instagram: formattedInstagram,
        },
        create: {
          id: "default",
          clinicName: "Consultório de Psicologia & Psiquiatria",
          tagline: "Atendimento ético, acolhedor e humanizado.",
          aboutText: "",
          heroTitle: "Cuidando da sua saúde mental com excelência",
          heroSubtitle: "Agende sua consulta presencial ou online com praticidade e total sigilo.",
          whatsappNumber: normalizedWhatsApp || null,
          phone: (data.phone || "").trim() || null,
          email: (data.email || "").trim() || null,
          instagram: formattedInstagram,
        },
      });
      message = "Contatos e redes sociais atualizados com sucesso.";
    } else {
      const parsed = profileSettingsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Dados inválidos", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const data = parsed.data;
      const normalizedWhatsApp = normalizeWhatsAppNumber(data.whatsappNumber);
      const formattedInstagram = formatInstagramHandle(data.instagram);

      await prisma.$transaction([
        prisma.siteSettings.upsert({
          where: { id: "default" },
          update: {
            clinicName: data.clinicName.trim(),
            tagline: (data.tagline || "").trim(),
            whatsappNumber: normalizedWhatsApp || null,
            phone: (data.phone || "").trim() || null,
            email: (data.email || "").trim() || null,
            instagram: formattedInstagram,
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
            instagram: formattedInstagram,
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
    }

    const [updatedSite, updatedProfile, firstAdmin] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: "default" } }),
      prisma.professionalProfile.findUnique({ where: { id: "default" } }),
      prisma.adminAccount.findFirst({
        orderBy: { createdAt: "asc" },
        select: { email: true, name: true, crpCrm: true },
      }),
    ]);

    try {
      revalidatePath("/", "layout");
      revalidatePath("/");
      revalidatePath("/agendar");
    } catch (revalErr) {
      console.warn("Aviso ao revalidar caminhos após atualizar perfil:", revalErr);
    }

    return NextResponse.json({
      success: true,
      message,
      application: {
        clinicName: updatedSite?.clinicName || "Consultório de Psicologia & Psiquiatria",
        tagline: updatedSite?.tagline || "Atendimento ético, acolhedor e humanizado.",
        appVersion: packageJson.version || "1.0.0",
      },
      professional: {
        fullName: updatedProfile?.fullName || firstAdmin?.name || "Dr(a). Profissional PSI",
        displayName: updatedProfile?.displayName || updatedProfile?.fullName || firstAdmin?.name || "Dr(a). Profissional PSI",
        crpCrm: updatedProfile?.crpCrm || firstAdmin?.crpCrm || "",
        title: updatedProfile?.title || "Psicólogo(a) Clínico(a)",
        adminEmail: firstAdmin?.email || adminSession.email,
      },
      contact: {
        whatsappNumber: updatedSite?.whatsappNumber || "",
        phone: updatedSite?.phone || "",
        email: updatedSite?.email || "",
        instagram: updatedSite?.instagram || "",
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
