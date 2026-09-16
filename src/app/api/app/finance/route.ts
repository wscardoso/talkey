import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status"); // PENDING | PAID | FAILED

  const [payments, notificationFailures] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tenantId: auth.session.tenantId,
        ...(status ? { status: status as "PENDING" | "PAID" | "FAILED" } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        booking: {
          include: {
            customer: { select: { name: true, phoneE164: true } },
            service: { select: { name: true } },
          },
        },
      },
    }),
    prisma.notificationLog.findMany({
      where: {
        tenantId: auth.session.tenantId,
        status: { in: ["retry", "failed"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        event: true,
        status: true,
        error: true,
        toE164: true,
        channel: true,
        createdAt: true,
        bookingId: true,
      },
    }),
  ]);

  return NextResponse.json({
    payments: payments.map((p) => ({
      id: p.id,
      status: p.status,
      amountCents: p.amountCents,
      provider: p.provider,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      bookingId: p.bookingId,
      bookingStatus: p.booking.status,
      customerName: p.booking.customer.name,
      customerPhone: p.booking.customer.phoneE164,
      serviceName: p.booking.service.name,
      startsAt: p.booking.startsAt.toISOString(),
    })),
    notificationFailures: notificationFailures.map((n) => ({
      id: n.id,
      event: n.event,
      status: n.status,
      error: n.error,
      toE164: n.toE164,
      channel: n.channel,
      bookingId: n.bookingId,
      createdAt: n.createdAt.toISOString(),
    })),
    generatedAt: DateTime.utc().toISO(),
  });
}
