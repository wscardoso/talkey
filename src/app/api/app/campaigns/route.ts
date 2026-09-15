import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { uazapiSendText } from "@/lib/uazapi/client";

export const runtime = "nodejs";

const SEGMENTS = [
  "inactive_30",
  "inactive_60",
  "inactive_90",
  "never_completed",
] as const;

type Segment = (typeof SEGMENTS)[number];

const sendSchema = z.object({
  segment: z.enum(SEGMENTS),
  message: z.string().trim().min(10).max(1500),
  customerIds: z.array(z.string().uuid()).optional(),
});

async function resolveSegment(
  tenantId: string,
  segment: Segment,
): Promise<Array<{ id: string; name: string; phoneE164: string }>> {
  const customers = await prisma.customer.findMany({
    where: { tenantId, marketingOptIn: true },
    select: {
      id: true,
      name: true,
      phoneE164: true,
      bookings: {
        where: { status: { in: ["COMPLETED", "CONFIRMED", "CHECKED_IN"] } },
        orderBy: { startsAt: "desc" },
        take: 1,
        select: { startsAt: true },
      },
    },
  });

  const now = DateTime.utc();
  const days =
    segment === "inactive_30"
      ? 30
      : segment === "inactive_60"
        ? 60
        : segment === "inactive_90"
          ? 90
          : null;

  return customers
    .filter((c) => {
      const last = c.bookings[0];
      if (segment === "never_completed") return c.bookings.length === 0;
      if (!last || days == null) return false;
      const lastDt = DateTime.fromJSDate(last.startsAt, { zone: "utc" });
      return now.diff(lastDt, "days").days >= days;
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      phoneE164: c.phoneE164,
    }));
}

export async function GET(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const segment = (url.searchParams.get("segment") ??
    "inactive_30") as Segment;
  if (!SEGMENTS.includes(segment)) {
    return NextResponse.json({ error: "INVALID_SEGMENT" }, { status: 400 });
  }

  const recipients = await resolveSegment(auth.session.tenantId, segment);
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: { waInstanceId: true, name: true, slug: true },
  });

  return NextResponse.json({
    segment,
    segments: [
      { id: "inactive_30", label: "Inativos há 30+ dias" },
      { id: "inactive_60", label: "Inativos há 60+ dias" },
      { id: "inactive_90", label: "Inativos há 90+ dias" },
      { id: "never_completed", label: "Sem horário ativo/concluído" },
    ],
    count: recipients.length,
    recipients: recipients.slice(0, 100),
    hasWhatsApp: Boolean(tenant?.waInstanceId),
    bookingUrl: `/agendar/${tenant?.slug ?? ""}`,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: { waInstanceId: true, name: true, slug: true },
  });
  if (!tenant?.waInstanceId) {
    return NextResponse.json(
      {
        error: "WHATSAPP_DISCONNECTED",
        message: "Conecte o WhatsApp em /app/whatsapp antes de disparar.",
      },
      { status: 400 },
    );
  }

  let recipients = await resolveSegment(
    auth.session.tenantId,
    parsed.data.segment,
  );
  if (parsed.data.customerIds?.length) {
    const allow = new Set(parsed.data.customerIds);
    recipients = recipients.filter((r) => allow.has(r.id));
  }

  const batch = recipients.slice(0, 40);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const bookUrl = `${appUrl}/agendar/${tenant.slug}`;

  let sent = 0;
  let failed = 0;
  for (const r of batch) {
    const text = parsed.data.message
      .replaceAll("{cliente}", r.name)
      .replaceAll("{barbearia}", tenant.name)
      .replaceAll("{link}", bookUrl);
    const result = await uazapiSendText(
      tenant.waInstanceId,
      r.phoneE164,
      text,
    );
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({
    ok: true,
    targeted: batch.length,
    sent,
    failed,
    truncated: recipients.length > batch.length,
  });
}
