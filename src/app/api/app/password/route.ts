import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, "Senha com pelo menos 8 caracteres").max(72),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Confirmação não confere",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.confirmPassword?.[0] ??
      parsed.error.flatten().fieldErrors.newPassword?.[0] ??
      "Dados inválidos";
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: msg },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      id: auth.session.userId,
      tenantId: auth.session.tenantId,
    },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Senha atual incorreta" },
      { status: 403 },
    );
  }

  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Senha atual incorreta" },
      { status: 403 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });

  return NextResponse.json({ ok: true, message: "Senha atualizada" });
}
