import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { replaceRulesSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
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
  const parsed = replaceRulesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tenantId = auth.session.tenantId;
  await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({ where: { staffId, tenantId } });
    if (parsed.data.rules.length) {
      await tx.availabilityRule.createMany({
        data: parsed.data.rules.map((r) => ({
          tenantId,
          staffId,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          breakStart: r.breakStart ?? null,
          breakEnd: r.breakEnd ?? null,
          isActive: r.isActive ?? true,
        })),
      });
    }
  });

  const rules = await prisma.availabilityRule.findMany({
    where: { staffId, tenantId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ rules });
}
