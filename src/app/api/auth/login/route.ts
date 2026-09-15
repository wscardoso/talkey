import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "Corpo inválido" },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "E-mail ou senha inválidos" },
      { status: 422 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
      role: { in: ["OWNER", "MANAGER", "SUPER_ADMIN"] },
    },
    include: {
      tenant: {
        select: {
          id: true,
          slug: true,
          isActive: true,
          plan: true,
          trialEndsAt: true,
          subscriptionEndsAt: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos" },
      { status: 401 },
    );
  }

  if (!user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json(
      { error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos" },
      { status: 401 },
    );
  }

  const { syncTenantAccess } = await import("@/lib/billing/access");
  const access = await syncTenantAccess(user.tenantId);

  // Allow login even if expired — UI sends them to /app/assinatura
  if (!user.tenant.isActive && access.reason === "inactive" && access.plan !== "expired") {
    return NextResponse.json(
      { error: "TENANT_INACTIVE", message: "Conta desativada. Fale com o suporte." },
      { status: 403 },
    );
  }

  const token = createSessionToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const res = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
    },
    billing: {
      allowed: access.allowed,
      plan: access.plan,
      daysLeft: access.daysLeft,
      reason: access.reason,
      message: access.message,
    },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
