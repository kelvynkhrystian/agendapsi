import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const backups = await prisma.backupJob.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(backups);
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminSession = await requireAdmin();

    // 1. Exporta tabelas do banco de dados excluindo senhas e hashes confidenciais
    const [
      patients,
      services,
      appointments,
      packages,
      payments,
      clinicalRecords,
      anamnesisSubmissions,
      weeklyAvailability,
      siteSettings,
      legalPages,
    ] = await Promise.all([
      prisma.patient.findMany({
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          cpf: true,
          birthDate: true,
          isMinor: true,
          gender: true,
          address: true,
          guardians: true,
          createdAt: true,
        },
      }),
      prisma.service.findMany(),
      prisma.appointment.findMany(),
      prisma.appointmentPackage.findMany(),
      prisma.payment.findMany(),
      prisma.clinicalRecord.findMany(),
      prisma.anamnesisSubmission.findMany(),
      prisma.weeklyAvailability.findMany(),
      prisma.siteSettings.findMany(),
      prisma.legalPage.findMany(),
    ]);

    const backupData = {
      manifest: {
        system: "PSI — Sistema de Gestão de Consultórios",
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        generatedBy: adminSession.userId,
      },
      data: {
        patients,
        services,
        appointments,
        packages,
        payments,
        clinicalRecords,
        anamnesisSubmissions,
        weeklyAvailability,
        siteSettings,
        legalPages,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const sizeBytes = Buffer.byteLength(jsonString, "utf8");
    const checksumSha256 = crypto.createHash("sha256").update(jsonString).digest("hex");

    const backupDir = process.env.BACKUP_DIR || "./storage/backups";
    await fs.mkdir(backupDir, { recursive: true });

    const filename = `psi_backup_${Date.now()}_${checksumSha256.slice(0, 8)}.json`;
    const targetPath = path.join(backupDir, filename);
    await fs.writeFile(targetPath, jsonString, "utf8");

    // Registra job de backup
    const backupJob = await prisma.backupJob.create({
      data: {
        filename,
        sizeBytes,
        checksumSha256,
        status: "COMPLETED",
        details: JSON.stringify({
          patientCount: patients.length,
          appointmentCount: appointments.length,
          recordCount: clinicalRecords.length,
        }),
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: adminSession.userId,
        userRole: "ADMIN",
        action: "BACKUP_GENERATED",
        resource: "BackupJob",
        resourceId: backupJob.id,
        details: JSON.stringify({ filename, sizeBytes, checksumSha256 }),
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Backup do banco de dados gerado com sucesso.",
      backup: backupJob,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
    }
    console.error("Erro na geração do backup:", error);
    return NextResponse.json({ error: "Erro interno ao gerar backup." }, { status: 500 });
  }
}
