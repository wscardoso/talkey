import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import {
  createInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from "@/lib/auth/invite-token";
import { prisma } from "@/lib/prisma";
import { createInviteSchema } from "@/lib/validations/invite";

export const runtime = "nodejs";

function inviteAdminRoles(role: string) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const invites = await prisma.tenantInvite.findMany({
    where: {
      tenantId: auth.session.tenantId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invites });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  if (!inviteAdminRoles(auth.session.role)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Apenas o dono pode convidar usuários." },
      { status: 403 },
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

  const parsed = createInviteSchema.safeParse(body);
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

  const { email, role, name } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const pendingSame = await prisma.tenantInvite.findFirst({
    where: {
      tenantId: auth.session.tenantId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (pendingSame) {
    return NextResponse.json(
      {
        error: "INVITE_PENDING",
        message: "Já existe um convite pendente para este e-mail.",
      },
      { status: 409 },
    );
  }

  const token = createInviteToken();
  const invite = await prisma.tenantInvite.create({
    data: {
      tenantId: auth.session.tenantId,
      email,
      name: name ?? null,
      role,
      tokenHash: hashInviteToken(token),
      invitedByUserId: auth.session.userId,
      expiresAt: inviteExpiresAt(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/convite/${token}`;

  return NextResponse.json({ invite, inviteUrl, token }, { status: 201 });
}
