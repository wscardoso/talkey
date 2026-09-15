import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import {
  PREFERENCE_EVENTS,
  ensureTenantMessagingDefaults,
} from "@/lib/messaging/templates";

export const runtime = "nodejs";

const labels: Record<(typeof PREFERENCE_EVENTS)[number], string> = {
  booking_created: "Confirmação ao agendar",
  reminder_24h: "Lembrete 24h antes",
  reminder_2h: "Lembrete 2h antes",
  feedback_post: "Pedido de feedback após o serviço",
};

const patchSchema = z.object({
  event: z.enum(PREFERENCE_EVENTS),
  enabled: z.boolean(),
});

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  await ensureTenantMessagingDefaults(auth.session.tenantId);

  const prefs = await prisma.notificationPreference.findMany({
    where: { tenantId: auth.session.tenantId },
  });

  return NextResponse.json({
    preferences: PREFERENCE_EVENTS.map((event) => {
      const row = prefs.find((p) => p.event === event);
      return {
        event,
        label: labels[event],
        enabled: row?.enabled ?? true,
      };
    }),
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

  const updated = await prisma.notificationPreference.update({
    where: {
      tenantId_event: {
        tenantId: auth.session.tenantId,
        event: parsed.data.event,
      },
    },
    data: { enabled: parsed.data.enabled },
  });

  return NextResponse.json({
    preference: {
      event: updated.event,
      label: labels[updated.event as (typeof PREFERENCE_EVENTS)[number]],
      enabled: updated.enabled,
    },
  });
}
