import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { sendSignupWelcome } from "@/lib/auth/welcome";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/signup";

export const runtime = "nodejs";

const TRIAL_DAYS = 30;

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

  const parsed = signupSchema.safeParse(body);
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

  const data = parsed.data;
  const existingSlug = await prisma.tenant.findUnique({
    where: { slug: data.slug },
    select: { id: true },
  });
  if (existingSlug) {
    return NextResponse.json(
      { error: "SLUG_TAKEN", message: "Este link já está em uso. Escolha outro." },
      { status: 409 },
    );
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email: data.email },
    select: { id: true },
  });
  if (existingEmail) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN", message: "Já existe uma conta com este e-mail." },
      { status: 409 },
    );
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const passwordHash = hashPassword(data.password);
  const phoneDigits = data.phone ? data.phone.replace(/\D/g, "") : null;

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: data.slug,
        name: data.salonName,
        email: data.email,
        phone: data.phone,
        whatsappE164: phoneDigits,
        timezone: "America/Sao_Paulo",
        brandPrimary: "#C4A35A",
        plan: "trial",
        isActive: true,
        trialStartedAt: now,
        trialEndsAt,
        waProvider: "uazapi",
        slotIntervalMin: 15,
        minLeadMin: 30,
        maxAdvanceDays: 45,
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: data.email,
        name: data.ownerName,
        role: "OWNER",
        isActive: true,
        passwordHash,
        lastLoginAt: now,
      },
    });

    return { tenant, user };
  });

  const { ensureTenantMessagingDefaults } = await import(
    "@/lib/messaging/templates"
  );
  void ensureTenantMessagingDefaults(result.tenant.id).catch((err) =>
    console.error("[signup:messaging-defaults]", err),
  );

  void sendSignupWelcome({
    ownerName: data.ownerName,
    salonName: data.salonName,
    slug: data.slug,
    phoneE164: data.phone,
    trialDays: TRIAL_DAYS,
  }).catch((err) => console.error("[signup:welcome]", err));

  const token = createSessionToken({
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
    email: result.user.email,
  });

  const res = NextResponse.json(
    {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        tenantSlug: result.tenant.slug,
      },
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
        trialEndsAt: result.tenant.trialEndsAt,
        bookingUrl: `/agendar/${result.tenant.slug}`,
      },
    },
    { status: 201 },
  );
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
