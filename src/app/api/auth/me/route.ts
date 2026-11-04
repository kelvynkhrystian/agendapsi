import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  if (session.role === "ADMIN") {
    const admin = await prisma.adminAccount.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        crpCrm: true,
        mustChangePassword: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      role: "ADMIN",
      user: admin,
    });
  }

  if (session.role === "PATIENT") {
    const patient = await prisma.patient.findUnique({
      where: { id: session.userId },
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
        emergencyContact: true,
        mustChangePassword: true,
        isActive: true,
        guardians: true,
      },
    });

    if (!patient || !patient.isActive) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      role: "PATIENT",
      user: patient,
    });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
