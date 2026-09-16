import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const planSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  priceCents: z.coerce.number().int().min(0).max(1_000_000_00),
  durationDays: z.coerce.number().int().min(7).max(365).default(30),
  visitLimit: z.coerce.number().int().min(1).max(200).nullable().optional(),
  serviceIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  const plans = await prisma.membershipPlan.findMany({
    where: { tenantId: auth.session.tenantId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { memberships: true } } },
  });

  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.priceCents,
      durationDays: p.durationDays,
      visitLimit: p.visitLimit,
      serviceIds: p.serviceIds,
      isActive: p.isActive,
      membersCount: p._count.memberships,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.serviceIds.length) {
    const count = await prisma.service.count({
      where: {
        tenantId: auth.session.tenantId,
        id: { in: data.serviceIds },
      },
    });
    if (count !== data.serviceIds.length) {
      return NextResponse.json(
        { error: "INVALID_SERVICES", message: "Serviço inválido" },
        { status: 400 },
      );
    }
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      tenantId: auth.session.tenantId,
      name: data.name,
      description: data.description || null,
      priceCents: data.priceCents,
      durationDays: data.durationDays,
      visitLimit: data.visitLimit ?? null,
      serviceIds: data.serviceIds,
      isActive: data.isActive,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerApi({ feature: "memberships" });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = planSchema
    .partial()
    .extend({ id: z.string().uuid() })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...rest } = parsed.data;
  const existing = await prisma.membershipPlan.findFirst({
    where: { id, tenantId: auth.session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const plan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.description !== undefined
        ? { description: rest.description || null }
        : {}),
      ...(rest.priceCents !== undefined ? { priceCents: rest.priceCents } : {}),
      ...(rest.durationDays !== undefined
        ? { durationDays: rest.durationDays }
        : {}),
      ...(rest.visitLimit !== undefined
        ? { visitLimit: rest.visitLimit }
        : {}),
      ...(rest.serviceIds !== undefined ? { serviceIds: rest.serviceIds } : {}),
      ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
    },
  });

  return NextResponse.json({ plan });
}
