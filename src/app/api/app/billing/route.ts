import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import {
  activateSubscription,
  syncTenantAccess,
} from "@/lib/billing/access";
import {
  createSubscriptionPixCheckout,
} from "@/lib/billing/asaas-checkout";
import { PLANS, formatPlanPrice } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const activateSchema = z.object({
  action: z.literal("activate"),
  plan: z.enum(["starter", "pro"]),
  months: z.coerce.number().int().min(1).max(24).optional().default(1),
  secret: z.string().optional(),
});

const requestSchema = z.object({
  action: z.literal("request"),
  plan: z.enum(["starter", "pro"]),
  note: z.string().trim().max(500).optional(),
});

const checkoutSchema = z.object({
  action: z.literal("checkout"),
  plan: z.enum(["starter", "pro"]),
  months: z.coerce.number().int().min(1).max(24).optional().default(1),
});

export async function GET() {
  const auth = await requireOwnerApi({ allowExpiredBilling: true });
  if (!auth.ok) return auth.response;

  const access = await syncTenantAccess(auth.session.tenantId);
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: {
      name: true,
      slug: true,
      plan: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    access,
    tenant,
    plans: (["starter", "pro"] as const).map((id) => ({
      id,
      label: PLANS[id].label,
      description: PLANS[id].description,
      priceLabel: `${formatPlanPrice(PLANS[id].priceCents)}/mês`,
      priceCents: PLANS[id].priceCents,
    })),
    features: {
      starter: [],
      pro: ["campaigns", "memberships", "themes"],
      trial: ["campaigns", "memberships", "themes"],
    },
    canSelfActivate: Boolean(process.env.BILLING_ACTIVATE_SECRET),
    canCheckout: true,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi({ allowExpiredBilling: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    console.info("[billing:request]", {
      tenantId: auth.session.tenantId,
      email: auth.session.email,
      plan: parsed.data.plan,
      note: parsed.data.note ?? null,
    });

    return NextResponse.json({
      ok: true,
      message:
        "Pedido registrado. Entraremos em contato para concluir o pagamento.",
    });
  }

  if (action === "checkout") {
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.session.tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        asaasCustomerId: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    try {
      const checkout = await createSubscriptionPixCheckout({
        tenantId: tenant.id,
        tenantName: tenant.name,
        email: auth.session.email || tenant.email || "dono@talkey.local",
        phone: tenant.phone,
        asaasCustomerId: tenant.asaasCustomerId,
        plan: parsed.data.plan,
        months: parsed.data.months,
      });

      return NextResponse.json({
        ok: true,
        checkout: {
          paymentId: checkout.paymentId,
          invoiceUrl: checkout.invoiceUrl,
          pixQrCode: checkout.pixQrCode,
          pixCopyPaste: checkout.pixCopyPaste,
          valueCents: checkout.valueCents,
          dryRun: checkout.dryRun,
          plan: parsed.data.plan,
          months: parsed.data.months,
        },
      });
    } catch (err) {
      console.error("[billing:checkout]", err);
      return NextResponse.json(
        {
          error: "CHECKOUT_FAILED",
          message: "Não foi possível gerar o PIX. Tente de novo.",
        },
        { status: 502 },
      );
    }
  }

  if (action === "activate") {
    const parsed = activateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const secret = process.env.BILLING_ACTIVATE_SECRET;
    if (!secret || parsed.data.secret !== secret) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Ativação automática indisponível. Solicite o plano.",
        },
        { status: 403 },
      );
    }

    const updated = await activateSubscription({
      tenantId: auth.session.tenantId,
      plan: parsed.data.plan,
      months: parsed.data.months,
    });
    const access = await syncTenantAccess(updated.id);

    return NextResponse.json({ ok: true, access, tenant: updated });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
