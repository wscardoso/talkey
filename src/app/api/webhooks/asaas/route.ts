import { NextResponse } from "next/server";
import { markPaymentPaid } from "@/lib/payments/deposit";
import { enqueueBookingCreated } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";
import { formatAddress } from "@/lib/formatters/br";
import {
  parseSubExternalRef,
} from "@/lib/billing/asaas-checkout";
import {
  activateSubscription,
  evaluateAccess,
} from "@/lib/billing/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.ASAAS_WEBHOOK_TOKEN;
  if (secret) {
    const token = request.headers.get("asaas-access-token");
    if (token !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true, ignored: "invalid_json" });
  }

  const root = body as Record<string, unknown>;
  const event = String(root.event ?? "");
  const payment = (root.payment ?? root) as Record<string, unknown>;
  const providerRef = typeof payment.id === "string" ? payment.id : null;
  const externalRef =
    typeof payment.externalReference === "string"
      ? payment.externalReference
      : null;

  if (
    !event.includes("PAYMENT_CONFIRMED") &&
    !event.includes("PAYMENT_RECEIVED") &&
    event !== "PAYMENT_CONFIRMED" &&
    event !== "PAYMENT_RECEIVED"
  ) {
    return NextResponse.json({ ok: true, ignored: event || "event" });
  }

  const sub = parseSubExternalRef(externalRef);
  if (sub) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: sub.tenantId },
      select: {
        id: true,
        plan: true,
        isActive: true,
        trialEndsAt: true,
        subscriptionEndsAt: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ ok: true, ignored: "tenant_missing" });
    }

    const access = evaluateAccess(tenant);
    const alreadyOk =
      access.allowed &&
      (tenant.plan === sub.plan || tenant.plan === "pro") &&
      tenant.subscriptionEndsAt &&
      tenant.subscriptionEndsAt.getTime() > Date.now() + 20 * 24 * 60 * 60 * 1000;

    if (!alreadyOk) {
      await activateSubscription({
        tenantId: sub.tenantId,
        plan: sub.plan,
        months: sub.months,
      });
    }

    return NextResponse.json({
      ok: true,
      subscription: true,
      tenantId: sub.tenantId,
      activated: !alreadyOk,
    });
  }

  const result = await markPaymentPaid({
    providerRef,
    bookingId: externalRef,
  });

  if (result.ok && result.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      include: {
        tenant: true,
        customer: true,
        staff: true,
        service: true,
      },
    });
    if (booking) {
      void enqueueBookingCreated({
        bookingId: booking.id,
        tenantId: booking.tenantId,
        tenantName: booking.tenant.name,
        tenantSlug: booking.tenant.slug,
        address: formatAddress(booking.tenant),
        timezone: booking.timezone,
        waInstanceId: booking.tenant.waInstanceId,
        waProvider: booking.tenant.waProvider ?? "uazapi",
        customerName: booking.customer.name,
        customerPhoneE164: `+${booking.customer.phoneE164.replace(/^\+/, "")}`,
        serviceName: booking.service.name,
        staffName: booking.staff.displayName,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        durationMin: booking.service.durationMin,
        priceCents: booking.priceCents,
        currency: booking.currency,
        status: booking.status,
      }).catch((err) => console.error("[whatsapp] asaas webhook", err));
    }
  }

  return NextResponse.json({ ok: true, paid: result.ok });
}
