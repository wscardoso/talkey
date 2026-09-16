import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { hashInviteToken } from "@/lib/auth/invite-token";
import { prisma } from "@/lib/prisma";
import { acceptInviteSchema } from "@/lib/validations/invite";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

async function findOpenInvite(token: string) {
  const tokenHash = hashInviteToken(token);
  return prisma.tenantInvite.findFirst({
    where: { tokenHash },
    include: {
      tenant: { select: { id: true, name: true, slug: true, isActive: true } },
    },
  });
}

export async function GET(_request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const invite = await findOpenInvite(token);
  if (!invite) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Convite inválido" },
      { status: 404 },
    );
  }

  const now = new Date();
  if (invite.revokedAt) {
    return NextResponse.json(
      { error: "REVOKED", message: "Este convite foi revogado" },
      { status: 410 },
    );
  }
  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "ALREADY_ACCEPTED", message: "Este convite já foi usado" },
      { status: 410 },
    );
  }
  if (invite.expiresAt <= now) {
    return NextResponse.json(
      { error: "EXPIRED", message: "Este convite expirou" },
      { status: 410 },
    );
  }

  return NextResponse.json({
    email: invite.email,
    name: invite.name,
    role: invite.role,
    expiresAt: invite.expiresAt,
    tenant: {
      name: invite.tenant.name,
      slug: invite.tenant.slug,
    },
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const invite = await findOpenInvite(token);
  if (!invite) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Convite inválido" },
      { status: 404 },
    );
  }

  const now = new Date();
  if (invite.revokedAt || invite.acceptedAt || invite.expiresAt <= now) {
    return NextResponse.json(
      {
        error: invite.expiresAt <= now ? "EXPIRED" : "UNAVAILABLE",
        message: "Este convite não está mais disponível",
      },
      { status: 410 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Corpo inválido" },
      { status: 400 },
    );
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Dados inválidos",
        issues: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  const existingUser = await prisma.user.findFirst({
    where: { email: invite.email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const passwordHash = hashPassword(parsed.data.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        tenantId: invite.tenantId,
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        role: invite.role,
        isActive: true,
      },
    });
    await tx.tenantInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now },
    });
    return created;
  });

  const sessionToken = createSessionToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: invite.tenant.slug,
    },
  });
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
