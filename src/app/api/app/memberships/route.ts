import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const createSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"]).optional(),
  visitsUsed: z.coerce.number().int().min(0).max(500).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

async function syncExpired(tenantId: string) {
  await prisma.membership.updateMany({
    where: {
      tenantId,
      status: "ACTIVE",
      endsAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

export async function GET() {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  await syncExpired(auth.session.tenantId);

  const memberships = await prisma.membership.findMany({
    where: { tenantId: auth.session.tenantId },
    orderBy: [{ status: "asc" }, { endsAt: "asc" }],
    include: {
      customer: { select: { id: true, name: true, phoneE164: true } },
      plan: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          visitLimit: true,
          durationDays: true,
        },
      },
    },
  });

  const now = DateTime.utc();
  const in7 = now.plus({ days: 7 }).toJSDate();
  const active = memberships.filter((m) => m.status === "ACTIVE");
  const pending = memberships.filter((m) => m.status === "PENDING");
  const expiring = active.filter((m) => m.endsAt <= in7);
  const revenueActive = active.reduce((a, m) => a + m.plan.priceCents, 0);

  return NextResponse.json({
    stats: {
      active: active.length,
      pending: pending.length,
      revenueActiveCents: revenueActive,
      expiring7d: expiring.length,
    },
    memberships: memberships.map((m) => ({
      id: m.id,
      status: m.status,
      startsAt: m.startsAt,
      endsAt: m.endsAt,
      visitsUsed: m.visitsUsed,
      visitLimit: m.plan.visitLimit,
      notes: m.notes,
      customer: m.customer,
      plan: m.plan,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [customer, plan] = await Promise.all([
    prisma.customer.findFirst({
      where: {
        id: parsed.data.customerId,
        tenantId: auth.session.tenantId,
      },
    }),
    prisma.membershipPlan.findFirst({
      where: {
        id: parsed.data.planId,
        tenantId: auth.session.tenantId,
        isActive: true,
      },
    }),
  ]);

  if (!customer || !plan) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Cliente ou plano inválido" },
      { status: 404 },
    );
  }

  const startsAt = new Date();
  const endsAt = DateTime.fromJSDate(startsAt)
    .plus({ days: plan.durationDays })
    .toJSDate();

  const membership = await prisma.membership.create({
    data: {
      tenantId: auth.session.tenantId,
      customerId: customer.id,
      planId: plan.id,
      status: "ACTIVE",
      startsAt,
      endsAt,
      visitsUsed: 0,
      notes: parsed.data.notes || null,
    },
    include: {
      customer: { select: { id: true, name: true, phoneE164: true } },
      plan: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          visitLimit: true,
          durationDays: true,
        },
      },
    },
  });

  return NextResponse.json({ membership }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.membership.findFirst({
    where: { id: parsed.data.id, tenantId: auth.session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const membership = await prisma.membership.update({
    where: { id: existing.id },
    data: {
      ...(parsed.data.status !== undefined
        ? { status: parsed.data.status }
        : {}),
      ...(parsed.data.visitsUsed !== undefined
        ? { visitsUsed: parsed.data.visitsUsed }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phoneE164: true } },
      plan: {
        select: {
          id: true,
          name: true,
          priceCents: true,
          visitLimit: true,
          durationDays: true,
        },
      },
    },
  });

  return NextResponse.json({ membership });
}
