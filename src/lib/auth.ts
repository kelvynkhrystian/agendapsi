import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "psi_dev_jwt_secret_98fbc9823e47a21cd678e012fae84321_secure"
);

export const AUTH_COOKIE_NAME = "psi_auth_token";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword?: boolean;
}

/**
 * Cria hash de senha seguro com bcrypt (10 rounds)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifica correspondência de senha em texto puro contra o hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Assina um JWT com validade configurada (padrão: 7 dias)
 */
export async function signToken(payload: SessionPayload, expiresIn = "7d"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

/**
 * Verifica e decodifica um token JWT
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Obtém a sessão atual a partir dos cookies da requisição
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Exige autenticação geral; lança erro ou retorna sessão
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Exige papel de ADMIN; lança erro se não for o profissional
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/**
 * Exige papel de PATIENT; valida titularidade do recurso
 */
export async function requirePatient(expectedPatientId?: string): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== "PATIENT") {
    throw new Error("FORBIDDEN");
  }
  if (expectedPatientId && session.userId !== expectedPatientId) {
    throw new Error("FORBIDDEN_RESOURCE_ACCESS");
  }
  return session;
}
