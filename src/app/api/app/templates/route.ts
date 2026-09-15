import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_KEYS,
  ensureTenantMessagingDefaults,
  type TemplateKey,
} from "@/lib/messaging/templates";

export const runtime = "nodejs";

const patchSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  body: z.string().trim().min(10).max(4000),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  await ensureTenantMessagingDefaults(auth.session.tenantId);

  const templates = await prisma.messageTemplate.findMany({
    where: { tenantId: auth.session.tenantId },
    orderBy: { key: "asc" },
  });

  return NextResponse.json({
    templates: templates.map((t) => ({
      key: t.key,
      label: t.label,
      body: t.body,
      isActive: t.isActive,
      defaultBody:
        DEFAULT_TEMPLATES[t.key as TemplateKey]?.body ?? t.body,
    })),
    variables: [
      "{cliente}",
      "{servico}",
      "{profissional}",
      "{barbearia}",
      "{endereco}",
      "{quando}",
    ],
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await ensureTenantMessagingDefaults(auth.session.tenantId);

  const updated = await prisma.messageTemplate.update({
    where: {
      tenantId_key: {
        tenantId: auth.session.tenantId,
        key: parsed.data.key,
      },
    },
    data: {
      body: parsed.data.body,
      ...(parsed.data.isActive !== undefined
        ? { isActive: parsed.data.isActive }
        : {}),
    },
  });

  return NextResponse.json({
    template: {
      key: updated.key,
      label: updated.label,
      body: updated.body,
      isActive: updated.isActive,
    },
  });
}
