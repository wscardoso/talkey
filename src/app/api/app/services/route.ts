import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { createServiceSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const services = await prisma.service.findMany({
    where: { tenantId: auth.session.tenantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMin: s.durationMin,
      bufferAfterMin: s.bufferAfterMin,
      priceCents: s.priceCents,
      currency: s.currency,
      category: s.category,
      isActive: s.isActive,
      requiresDeposit: s.requiresDeposit,
      sortOrder: s.sortOrder,
      imageUrl: s.imageUrl,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = createServiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const service = await prisma.service.create({
    data: {
      tenantId: auth.session.tenantId,
      name: data.name,
      description: data.description || null,
      durationMin: data.durationMin,
      bufferAfterMin: data.bufferAfterMin,
      priceCents: data.priceCents,
      category: data.category || null,
      requiresDeposit: data.requiresDeposit,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      imageUrl: data.imageUrl ? data.imageUrl : null,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
