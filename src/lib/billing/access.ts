import { prisma } from "@/lib/prisma";
import type { PlanId } from "@/lib/billing/plans";

export type TenantBillingFields = {
  id: string;
  plan: string;
  isActive: boolean;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
};

export type AccessStatus = {
  allowed: boolean;
  plan: PlanId | string;
  daysLeft: number | null;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
  reason: "ok" | "inactive" | "trial_expired" | "subscription_expired";
  message: string;
};

function asPlan(plan: string): PlanId | string {
  return plan;
}

function daysUntil(date: Date | null, now: Date): number | null {
  if (!date) return null;
  const ms = date.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function evaluateAccess(
  tenant: TenantBillingFields,
  now = new Date(),
): AccessStatus {
  if (!tenant.isActive) {
    return {
      allowed: false,
      plan: asPlan(tenant.plan),
      daysLeft: 0,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      reason: "inactive",
      message: "Conta desativada. Regularize a assinatura para continuar.",
    };
  }

  if (tenant.plan === "trial") {
    if (tenant.trialEndsAt && tenant.trialEndsAt.getTime() < now.getTime()) {
      return {
        allowed: false,
        plan: "expired",
        daysLeft: 0,
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt,
        reason: "trial_expired",
        message: "Seu período de teste terminou. Ative um plano para continuar.",
      };
    }
    return {
      allowed: true,
      plan: "trial",
      daysLeft: daysUntil(tenant.trialEndsAt, now),
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      reason: "ok",
      message: "Trial ativo",
    };
  }

  if (tenant.plan === "expired") {
    return {
      allowed: false,
      plan: "expired",
      daysLeft: 0,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      reason: "subscription_expired",
      message: "Assinatura expirada. Renove para continuar.",
    };
  }

  if (
    tenant.subscriptionEndsAt &&
    tenant.subscriptionEndsAt.getTime() < now.getTime()
  ) {
    return {
      allowed: false,
      plan: asPlan(tenant.plan),
      daysLeft: 0,
      trialEndsAt: tenant.trialEndsAt,
      subscriptionEndsAt: tenant.subscriptionEndsAt,
      reason: "subscription_expired",
      message: "Assinatura expirada. Renove para continuar.",
    };
  }

  return {
    allowed: true,
    plan: asPlan(tenant.plan),
    daysLeft: daysUntil(tenant.subscriptionEndsAt, now),
    trialEndsAt: tenant.trialEndsAt,
    subscriptionEndsAt: tenant.subscriptionEndsAt,
    reason: "ok",
    message: "Assinatura ativa",
  };
}

/** Persist expired state when trial/subscription lapses. */
export async function syncTenantAccess(
  tenantId: string,
): Promise<AccessStatus> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      isActive: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });

  if (!tenant) {
    return {
      allowed: false,
      plan: "expired",
      daysLeft: 0,
      trialEndsAt: null,
      subscriptionEndsAt: null,
      reason: "inactive",
      message: "Tenant não encontrado",
    };
  }

  const access = evaluateAccess(tenant);
  if (
    !access.allowed &&
    (access.reason === "trial_expired" ||
      access.reason === "subscription_expired") &&
    (tenant.isActive || tenant.plan !== "expired")
  ) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan: "expired",
        isActive: false,
      },
    });
  }

  return access;
}

/** Returns true if tenant may accept public bookings; persists expiry when needed. */
export async function ensurePublicTenantAccess(
  tenant: TenantBillingFields,
): Promise<boolean> {
  const access = evaluateAccess(tenant);
  if (access.allowed) return true;
  if (
    access.reason === "trial_expired" ||
    access.reason === "subscription_expired"
  ) {
    await syncTenantAccess(tenant.id);
  }
  return false;
}

/**
 * Expire all lapsed trial/subscription tenants in bulk (cron).
 * Returns how many rows were updated.
 */
export async function expireLapsedTenants(limit = 100): Promise<number> {
  const now = new Date();
  const candidates = await prisma.tenant.findMany({
    where: {
      OR: [
        {
          plan: "trial",
          isActive: true,
          trialEndsAt: { lt: now },
        },
        {
          plan: { in: ["starter", "pro"] },
          isActive: true,
          subscriptionEndsAt: { lt: now },
        },
      ],
    },
    select: {
      id: true,
      plan: true,
      isActive: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
    take: limit,
  });

  let expired = 0;
  for (const tenant of candidates) {
    const access = evaluateAccess(tenant, now);
    if (
      !access.allowed &&
      (access.reason === "trial_expired" ||
        access.reason === "subscription_expired")
    ) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { plan: "expired", isActive: false },
      });
      expired += 1;
    }
  }
  return expired;
}

/** Months × 30 days from the later of now or current subscription end. */
export function computeSubscriptionEnd(
  months: number,
  currentEndsAt: Date | null,
  now = new Date(),
): Date {
  const capped = Math.max(1, Math.min(months, 24));
  const base =
    currentEndsAt && currentEndsAt.getTime() > now.getTime()
      ? currentEndsAt
      : now;
  return new Date(base.getTime() + capped * 30 * 24 * 60 * 60 * 1000);
}

export async function activateSubscription(params: {
  tenantId: string;
  plan: "starter" | "pro";
  months: number;
}): Promise<TenantBillingFields> {
  const months = Math.max(1, Math.min(params.months, 24));
  const current = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { subscriptionEndsAt: true },
  });
  const ends = computeSubscriptionEnd(
    months,
    current?.subscriptionEndsAt ?? null,
  );

  return prisma.tenant.update({
    where: { id: params.tenantId },
    data: {
      plan: params.plan,
      isActive: true,
      subscriptionEndsAt: ends,
    },
    select: {
      id: true,
      plan: true,
      isActive: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
    },
  });
}

export async function deactivateTenant(tenantId: string): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan: "expired", isActive: false },
  });
}
