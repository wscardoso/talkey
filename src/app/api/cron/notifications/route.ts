import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-store";
import { expireLapsedTenants } from "@/lib/billing/access";
import { processQueuedNotifications } from "@/lib/whatsapp";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json({
      ok: true,
      skipped: "demo_mode",
      hint: "Demo uses in-process setTimeout for REMINDER_24H",
    });
  }

  const { expireStaleDeposits } = await import("@/lib/payments/deposit");
  const expiredDeposits = await expireStaleDeposits(50);
  const expiredTenants = await expireLapsedTenants(100);
  const result = await processQueuedNotifications(20);
  console.info("[cron:notifications]", {
    ...result,
    expiredDeposits,
    expiredTenants,
  });
  return NextResponse.json({
    ok: true,
    expired: expiredDeposits,
    expiredDeposits,
    expiredTenants,
    ...result,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
