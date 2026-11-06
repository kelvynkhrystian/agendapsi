import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const settingsSchema = z.object({
  timezone: z.string().min(1, "Fuso horário é obrigatório"),
  minBookingNoticeHours: z.number().int().min(0, "Antecedência mínima deve ser 0 ou maior"),
  maxBookingHorizonDays: z.number().int().min(1, "Horizonte máximo deve ser de pelo menos 1 dia"),
  defaultCancellationNoticeDays: z.number().int().min(0, "Prazo de cancelamento deve ser 0 ou maior"),
  defaultBufferMinutes: z.number().int().min(0, "Buffer de atendimento deve ser 0 ou maior"),
  defaultModality: z.enum(["PRESENTIAL", "ONLINE", "BOTH"]),
  defaultConfirmationPolicy: z.enum([
    "AUTOMATIC",
    "UPON_PAYMENT",
    "MANUAL_ADMIN",
    "PAYMENT_AND_ADMIN",
  ]),
  allowPatientReschedule: z.boolean().default(true),
  syncExistingServices: z.boolean().default(false),
});

export async function GET() {
  try {
    await requireAdmin();

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json({
      timezone: settings.timezone || "America/Sao_Paulo",
      minBookingNoticeHours: settings.minBookingNoticeHours ?? 24,
      maxBookingHorizonDays: settings.maxBookingHorizonDays ?? 30,
      defaultCancellationNoticeDays: settings.defaultCancellationNoticeDays ?? 3,
      defaultBufferMinutes: settings.defaultBufferMinutes ?? 10,
      defaultModality: settings.defaultModality || "BOTH",
      defaultConfirmationPolicy: settings.defaultConfirmationPolicy || "AUTOMATIC",
      allowPatientReschedule: settings.allowPatientReschedule ?? true,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao carregar configurações gerais de serviços:", error);
    return NextResponse.json(
      { error: "Erro ao carregar configurações gerais." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos.", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      timezone,
      minBookingNoticeHours,
      maxBookingHorizonDays,
      defaultCancellationNoticeDays,
      defaultBufferMinutes,
      defaultModality,
      defaultConfirmationPolicy,
      allowPatientReschedule,
      syncExistingServices,
    } = parsed.data;

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        timezone,
        minBookingNoticeHours,
        maxBookingHorizonDays,
        defaultCancellationNoticeDays,
        defaultBufferMinutes,
        defaultModality,
        defaultConfirmationPolicy,
        allowPatientReschedule,
      },
      create: {
        id: "default",
        timezone,
        minBookingNoticeHours,
        maxBookingHorizonDays,
        defaultCancellationNoticeDays,
        defaultBufferMinutes,
        defaultModality,
        defaultConfirmationPolicy,
        allowPatientReschedule,
      },
    });

    // Se solicitado sincronizar com serviços ativos existentes
    if (syncExistingServices) {
      await prisma.service.updateMany({
        where: { isActive: true },
        data: {
          bufferMinutes: defaultBufferMinutes,
          modality: defaultModality,
          confirmationPolicy: defaultConfirmationPolicy,
          cancellationNoticeDays: defaultCancellationNoticeDays,
        },
      });
    }

    // Registro na trilha de auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        userRole: user.role,
        action: "UPDATE_GENERAL_SERVICE_SETTINGS",
        resource: "SystemSettings",
        resourceId: "default",
        details: JSON.stringify({
          timezone,
          minBookingNoticeHours,
          maxBookingHorizonDays,
          defaultCancellationNoticeDays,
          defaultBufferMinutes,
          defaultModality,
          defaultConfirmationPolicy,
          allowPatientReschedule,
          syncExistingServices,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configurações gerais salvas com sucesso!",
      settings: {
        timezone: updated.timezone,
        minBookingNoticeHours: updated.minBookingNoticeHours,
        maxBookingHorizonDays: updated.maxBookingHorizonDays,
        defaultCancellationNoticeDays: updated.defaultCancellationNoticeDays,
        defaultBufferMinutes: updated.defaultBufferMinutes,
        defaultModality: updated.defaultModality,
        defaultConfirmationPolicy: updated.defaultConfirmationPolicy,
        allowPatientReschedule: updated.allowPatientReschedule,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito ao administrador." }, { status: 403 });
    }
    console.error("Erro ao atualizar configurações gerais de serviços:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações gerais." },
      { status: 500 }
    );
  }
}
