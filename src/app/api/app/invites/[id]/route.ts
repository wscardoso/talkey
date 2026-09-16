import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "OWNER" && auth.session.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Apenas o dono pode revogar convites." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const invite = await prisma.tenantInvite.findFirst({
    where: { id, tenantId: auth.session.tenantId },
    select: { id: true, acceptedAt: true, revokedAt: true },
  });

  if (!invite) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Convite não encontrado" },
      { status: 404 },
    );
  }
  if (invite.acceptedAt) {
    return NextResponse.json(
      { error: "ALREADY_ACCEPTED", message: "Convite já foi aceito" },
      { status: 409 },
    );
  }
  if (invite.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.tenantInvite.update({
    where: { id: invite.id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
