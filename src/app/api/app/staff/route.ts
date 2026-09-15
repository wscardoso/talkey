import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { createStaffSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

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
      return { ok: false as const, error: "INVALID_SERVICE" };
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

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const staff = await prisma.staff.findMany({
    where: { tenantId: auth.session.tenantId },
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    include: {
      services: { select: { serviceId: true } },
      rules: {
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      },
      _count: { select: { exceptions: true, bookings: true } },
    },
  });

  return NextResponse.json({
    staff: staff.map((s) => ({
      id: s.id,
      displayName: s.displayName,
      bio: s.bio,
      color: s.color,
      status: s.status,
      sortOrder: s.sortOrder,
      serviceIds: s.services.map((x) => x.serviceId),
      rules: s.rules.map((r) => ({
        id: r.id,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        breakStart: r.breakStart,
        breakEnd: r.breakEnd,
        isActive: r.isActive,
      })),
      exceptionCount: s._count.exceptions,
      bookingCount: s._count.bookings,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const created = await prisma.staff.create({
    data: {
      tenantId: auth.session.tenantId,
      displayName: data.displayName,
      bio: data.bio || null,
      color: data.color || null,
      status: data.status,
      sortOrder: data.sortOrder,
    },
  });

  const sync = await syncStaffServices(
    auth.session.tenantId,
    created.id,
    data.serviceIds,
  );
  if (!sync.ok) {
    await prisma.staff.delete({ where: { id: created.id } });
    return NextResponse.json(
      { error: sync.error, message: "Serviço inválido para este tenant" },
      { status: 400 },
    );
  }

  return NextResponse.json({ staff: { id: created.id } }, { status: 201 });
}
