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

export async function activateSubscription(params: {
  tenantId: string;
  plan: "starter" | "pro";
  months: number;
}): Promise<TenantBillingFields> {
  const months = Math.max(1, Math.min(params.months, 24));
  const now = new Date();
  const ends = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

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
