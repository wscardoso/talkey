import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { updateServiceSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const service = await prisma.service.findFirst({
    where: { id, tenantId: auth.session.tenantId },
  });
  if (!service) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ service });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const body = await request.json().catch(() => null);
  const parsed = updateServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.service.updateMany({
    where: { id, tenantId: auth.session.tenantId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description || null }
        : {}),
      ...(data.durationMin !== undefined
        ? { durationMin: data.durationMin }
        : {}),
      ...(data.bufferAfterMin !== undefined
        ? { bufferAfterMin: data.bufferAfterMin }
        : {}),
      ...(data.priceCents !== undefined ? { priceCents: data.priceCents } : {}),
      ...(data.category !== undefined
        ? { category: data.category || null }
        : {}),
      ...(data.requiresDeposit !== undefined
        ? { requiresDeposit: data.requiresDeposit }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });

  if (!updated.count) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id, tenantId: auth.session.tenantId },
  });
  return NextResponse.json({ service });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.service.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (existing._count.bookings > 0) {
    await prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  await prisma.staffService.deleteMany({
    where: { serviceId: id, tenantId: auth.session.tenantId },
  });
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
