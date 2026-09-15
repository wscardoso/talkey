import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { updateStaffSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function syncStaffServices(
  tenantId: string,
  staffId: string,
  serviceIds: string[],
) {
  const unique = [...new Set(serviceIds)];
  if (unique.length) {
    const owned = await prisma.service.count({
      where: { tenantId, id: { in: unique } },
    });
    if (owned !== unique.length) {
      return { ok: false as const };
    }
  }
  await prisma.staffService.deleteMany({ where: { staffId, tenantId } });
  if (unique.length) {
    await prisma.staffService.createMany({
      data: unique.map((serviceId) => ({ staffId, serviceId, tenantId })),
    });
  }
  return { ok: true as const };
}

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const staff = await prisma.staff.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: {
      services: { select: { serviceId: true } },
      rules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      exceptions: {
        orderBy: { date: "desc" },
        take: 60,
      },
    },
  });

  if (!staff) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    staff: {
      id: staff.id,
      displayName: staff.displayName,
      bio: staff.bio,
      color: staff.color,
      status: staff.status,
      sortOrder: staff.sortOrder,
      serviceIds: staff.services.map((x) => x.serviceId),
      rules: staff.rules,
      exceptions: staff.exceptions.map((e) => ({
        id: e.id,
        date: e.date.toISOString().slice(0, 10),
        isDayOff: e.isDayOff,
        startTime: e.startTime,
        endTime: e.endTime,
        reason: e.reason,
      })),
    },
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const body = await request.json().catch(() => null);
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const existing = await prisma.staff.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.staff.update({
    where: { id },
    data: {
      ...(data.displayName !== undefined
        ? { displayName: data.displayName }
        : {}),
      ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
      ...(data.color !== undefined ? { color: data.color || null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  if (data.serviceIds !== undefined) {
    const sync = await syncStaffServices(
      auth.session.tenantId,
      id,
      data.serviceIds,
    );
    if (!sync.ok) {
      return NextResponse.json(
        { error: "INVALID_SERVICE", message: "Serviço inválido" },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  const existing = await prisma.staff.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (existing._count.bookings > 0) {
    await prisma.staff.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
