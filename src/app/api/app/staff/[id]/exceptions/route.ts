import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { createExceptionSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id: staffId } = await ctx.params;

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, tenantId: auth.session.tenantId },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const exceptions = await prisma.availabilityException.findMany({
    where: { staffId, tenantId: auth.session.tenantId },
    orderBy: { date: "desc" },
    take: 90,
  });

  return NextResponse.json({
    exceptions: exceptions.map((e) => ({
      id: e.id,
      date: e.date.toISOString().slice(0, 10),
      isDayOff: e.isDayOff,
      startTime: e.startTime,
      endTime: e.endTime,
      reason: e.reason,
    })),
  });
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id: staffId } = await ctx.params;

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, tenantId: auth.session.tenantId },
    select: { id: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createExceptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const date = new Date(`${data.date}T12:00:00.000Z`);

  const exception = await prisma.availabilityException.upsert({
    where: { staffId_date: { staffId, date } },
    create: {
      tenantId: auth.session.tenantId,
      staffId,
      date,
      isDayOff: data.isDayOff,
      startTime: data.isDayOff ? null : (data.startTime ?? null),
      endTime: data.isDayOff ? null : (data.endTime ?? null),
      reason: data.reason || null,
    },
    update: {
      isDayOff: data.isDayOff,
      startTime: data.isDayOff ? null : (data.startTime ?? null),
      endTime: data.isDayOff ? null : (data.endTime ?? null),
      reason: data.reason || null,
    },
  });

  return NextResponse.json(
    {
      exception: {
        id: exception.id,
        date: data.date,
        isDayOff: exception.isDayOff,
        startTime: exception.startTime,
        endTime: exception.endTime,
        reason: exception.reason,
      },
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;
  const { id: staffId } = await ctx.params;

  const url = new URL(request.url);
  const exceptionId = url.searchParams.get("exceptionId");
  if (!exceptionId) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "exceptionId obrigatório" },
      { status: 400 },
    );
  }

  const deleted = await prisma.availabilityException.deleteMany({
    where: {
      id: exceptionId,
      staffId,
      tenantId: auth.session.tenantId,
    },
  });

  if (!deleted.count) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
