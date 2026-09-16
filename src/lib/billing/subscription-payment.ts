import {
  activateSubscription,
  evaluateAccess,
  type TenantBillingFields,
} from "@/lib/billing/access";
import { PLANS } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type RecordSubscriptionPaymentParams = {
  tenantId: string;
  providerRef: string;
  plan: "starter" | "pro";
  months: number;
  amountCents?: number;
  externalRef?: string | null;
  rawPayload?: Prisma.InputJsonValue;
};

/**
 * Idempotent SaaS subscription activation keyed by Asaas payment id.
 * Returns whether a new activation happened.
 */
export async function recordSubscriptionPayment(
  params: RecordSubscriptionPaymentParams,
): Promise<{ activated: boolean; alreadyRecorded: boolean }> {
  const existing = await prisma.subscriptionPayment.findUnique({
    where: { providerRef: params.providerRef },
    select: { id: true },
  });
  if (existing) {
    return { activated: false, alreadyRecorded: true };
  }

  const months = Math.max(1, Math.min(params.months, 24));
  const amountCents =
    params.amountCents ?? PLANS[params.plan].priceCents * months;

  try {
    await prisma.subscriptionPayment.create({
      data: {
        tenantId: params.tenantId,
        provider: "ASAAS",
        providerRef: params.providerRef,
        plan: params.plan,
        months,
        amountCents,
        status: "PAID",
        externalRef: params.externalRef ?? null,
        rawPayload: params.rawPayload,
        paidAt: new Date(),
      },
    });
  } catch (err) {
    // Unique race on providerRef — treat as already processed
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return { activated: false, alreadyRecorded: true };
    }
    throw err;
  }

  await activateSubscription({
    tenantId: params.tenantId,
    plan: params.plan,
    months,
  });

  return { activated: true, alreadyRecorded: false };
}

/** Public booking is allowed only when evaluateAccess says so. */
export function isTenantPubliclyBookable(
  tenant: TenantBillingFields,
  now = new Date(),
): boolean {
  return evaluateAccess(tenant, now).allowed;
}
