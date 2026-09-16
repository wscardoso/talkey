/**
 * Ops CLI — manage tenant subscription without Prisma Studio.
 *
 * Usage:
 *   npx tsx scripts/ops-tenant.ts status <slug>
 *   npx tsx scripts/ops-tenant.ts activate <slug> <starter|pro> [months]
 *   npx tsx scripts/ops-tenant.ts renew <slug> <starter|pro> [months]
 *   npx tsx scripts/ops-tenant.ts deactivate <slug>
 *
 * Requires DATABASE_URL. Prefer running inside Coolify / staging, not on shared
 * production shells without review.
 */
import { PrismaClient } from "@prisma/client";
import {
  activateSubscription,
  deactivateTenant,
  evaluateAccess,
  syncTenantAccess,
} from "../src/lib/billing/access";

const prisma = new PrismaClient();

function usage(): never {
  console.log(`Usage:
  npx tsx scripts/ops-tenant.ts status <slug>
  npx tsx scripts/ops-tenant.ts activate <slug> <starter|pro> [months]
  npx tsx scripts/ops-tenant.ts renew <slug> <starter|pro> [months]
  npx tsx scripts/ops-tenant.ts deactivate <slug>`);
  process.exit(1);
}

async function findBySlug(slug: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      plan: true,
      isActive: true,
      trialEndsAt: true,
      subscriptionEndsAt: true,
      email: true,
    },
  });
  if (!tenant) {
    console.error(`Tenant not found: ${slug}`);
    process.exit(1);
  }
  return tenant;
}

async function printStatus(slug: string) {
  const tenant = await findBySlug(slug);
  const access = evaluateAccess(tenant);
  console.log(
    JSON.stringify(
      {
        ...tenant,
        access,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const [, , cmd, slug, planArg, monthsArg] = process.argv;
  if (!cmd || !slug) usage();

  if (cmd === "status") {
    await printStatus(slug);
    return;
  }

  if (cmd === "deactivate") {
    const tenant = await findBySlug(slug);
    await deactivateTenant(tenant.id);
    console.log(`Deactivated ${slug}`);
    await printStatus(slug);
    return;
  }

  if (cmd === "activate" || cmd === "renew") {
    if (planArg !== "starter" && planArg !== "pro") usage();
    const months = monthsArg ? Number(monthsArg) : 1;
    if (!Number.isFinite(months) || months < 1 || months > 24) {
      console.error("months must be 1..24");
      process.exit(1);
    }
    const tenant = await findBySlug(slug);
    const updated = await activateSubscription({
      tenantId: tenant.id,
      plan: planArg,
      months,
    });
    const access = await syncTenantAccess(updated.id);
    console.log(
      JSON.stringify(
        {
          action: cmd,
          slug,
          tenant: updated,
          access,
        },
        null,
        2,
      ),
    );
    return;
  }

  usage();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
