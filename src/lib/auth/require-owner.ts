import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { syncTenantAccess } from "@/lib/billing/access";
import {
  PLAN_FEATURE_LABELS,
  planHasFeature,
  type PlanFeature,
} from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

const OWNER_ROLES = new Set(["OWNER", "MANAGER", "SUPER_ADMIN"]);

export async function requireOwnerSession(options?: {
  allowExpiredBilling?: boolean;
  feature?: PlanFeature;
}): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !OWNER_ROLES.has(session.role)) {
    redirect("/app/login");
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      tenantId: session.tenantId,
      isActive: true,
    },
    select: { id: true, role: true },
  });

  if (!user || !OWNER_ROLES.has(user.role)) {
    redirect("/app/login");
  }

  if (!options?.allowExpiredBilling) {
    const access = await syncTenantAccess(session.tenantId);
    if (!access.allowed) {
      redirect("/app/assinatura?blocked=1");
    }
    if (options?.feature && !planHasFeature(String(access.plan), options.feature)) {
      redirect(
        `/app/assinatura?upgrade=1&feature=${encodeURIComponent(options.feature)}`,
      );
    }
  }

  return session;
}

export async function requireOwnerApi(options?: {
  allowExpiredBilling?: boolean;
  feature?: PlanFeature;
}): Promise<
  { ok: true; session: SessionPayload; plan: string } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session || !OWNER_ROLES.has(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Faça login para continuar" },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      tenantId: session.tenantId,
      isActive: true,
    },
    select: { id: true, role: true },
  });

  if (!user || !OWNER_ROLES.has(user.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", message: "Sessão inválida" },
        { status: 401 },
      ),
    };
  }

  let plan = "expired";

  if (!options?.allowExpiredBilling) {
    const access = await syncTenantAccess(session.tenantId);
    plan = String(access.plan);
    if (!access.allowed) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "PAYMENT_REQUIRED",
            message: access.message,
            reason: access.reason,
          },
          { status: 402 },
        ),
      };
    }
    if (options?.feature && !planHasFeature(plan, options.feature)) {
      const label = PLAN_FEATURE_LABELS[options.feature];
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "PLAN_UPGRADE_REQUIRED",
            message: `${label} está disponível no plano Pro. Faça upgrade para continuar.`,
            feature: options.feature,
            plan,
          },
          { status: 403 },
        ),
      };
    }
  } else {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { plan: true },
    });
    plan = tenant?.plan ?? "expired";
  }

  return { ok: true, session, plan };
}
