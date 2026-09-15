import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "7d"; // today | 7d | 30d | 90d

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: { timezone: true },
  });
  const tz = tenant?.timezone ?? "America/Sao_Paulo";
  const now = DateTime.now().setZone(tz);
  const start =
    period === "today"
      ? now.startOf("day")
      : period === "30d"
        ? now.minus({ days: 30 }).startOf("day")
        : period === "90d"
          ? now.minus({ days: 90 }).startOf("day")
          : now.minus({ days: 7 }).startOf("day");
  const startUtc = start.toUTC().toJSDate();
  const endUtc = now.endOf("day").toUTC().toJSDate();

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId: auth.session.tenantId,
      startsAt: { gte: startUtc, lte: endUtc },
    },
    include: {
      service: { select: { name: true, durationMin: true } },
      staff: { select: { displayName: true } },
      customer: { select: { id: true, name: true, phoneE164: true } },
    },
  });

  const payments = await prisma.payment.findMany({
    where: {
      tenantId: auth.session.tenantId,
      status: "PAID",
      paidAt: { gte: startUtc, lte: endUtc },
    },
  });

  const active = bookings.filter((b) =>
    ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(b.status),
  );
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const noShow = bookings.filter((b) => b.status === "NO_SHOW");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");

  const bookedMinutes = active.reduce(
    (acc, b) => acc + b.service.durationMin,
    0,
  );
  const days = Math.max(1, Math.ceil(now.diff(start, "days").days));
  // Rough capacity: 2 staff × 8h × days
  const capacityMinutes = 2 * 8 * 60 * days;
  const occupancyPct = Math.min(
    100,
    Math.round((bookedMinutes / capacityMinutes) * 100),
  );

  const revenueServices = completed.reduce((a, b) => a + b.priceCents, 0);
  const revenuePix = payments.reduce((a, p) => a + p.amountCents, 0);
  const ticketMedioCents =
    completed.length === 0
      ? 0
      : Math.round(revenueServices / completed.length);

  const byStatus: Record<string, number> = {
    CONFIRMED: 0,
    CHECKED_IN: 0,
    COMPLETED: 0,
    CANCELLED: 0,
    NO_SHOW: 0,
    PENDING_PAYMENT: 0,
  };
  for (const b of bookings) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
  }

  const hourCount = new Map<number, number>();
  const weekdayCount = new Map<number, number>();
  for (const b of active) {
    const local = DateTime.fromJSDate(b.startsAt, { zone: "utc" }).setZone(tz);
    hourCount.set(local.hour, (hourCount.get(local.hour) ?? 0) + 1);
    weekdayCount.set(local.weekday, (weekdayCount.get(local.weekday) ?? 0) + 1);
  }
  const peakHours = [...hourCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hour, count]) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      count,
    }));
  const weekdayLabels = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const byWeekday = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
    day: weekdayLabels[d],
    count: weekdayCount.get(d) ?? 0,
  }));

  const customerCount = new Map<
    string,
    { name: string; count: number; phone: string }
  >();
  for (const b of active) {
    const prev = customerCount.get(b.customer.id);
    if (prev) prev.count += 1;
    else {
      customerCount.set(b.customer.id, {
        name: b.customer.name,
        count: 1,
        phone: b.customer.phoneE164,
      });
    }
  }
  const topCustomers = [...customerCount.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const serviceCount = new Map<string, number>();
  const staffCount = new Map<string, number>();
  for (const b of active) {
    serviceCount.set(
      b.service.name,
      (serviceCount.get(b.service.name) ?? 0) + 1,
    );
    staffCount.set(
      b.staff.displayName,
      (staffCount.get(b.staff.displayName) ?? 0) + 1,
    );
  }

  const topServices = [...serviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const topStaff = [...staffCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const firstBookingByCustomer = await prisma.booking.groupBy({
    by: ["customerId"],
    where: { tenantId: auth.session.tenantId },
    _min: { startsAt: true },
  });
  const firstMap = new Map(
    firstBookingByCustomer.map((r) => [
      r.customerId,
      r._min.startsAt?.getTime() ?? 0,
    ]),
  );
  let novos = 0;
  let recorrentes = 0;
  const seen = new Set<string>();
  for (const b of active) {
    if (seen.has(b.customer.id)) continue;
    seen.add(b.customer.id);
    const first = firstMap.get(b.customer.id) ?? 0;
    if (first >= startUtc.getTime()) novos += 1;
    else recorrentes += 1;
  }

  const totalClosed = completed.length + noShow.length + cancelled.length;
  const noShowPct =
    totalClosed === 0 ? 0 : Math.round((noShow.length / totalClosed) * 100);
  const cancelPct =
    totalClosed === 0 ? 0 : Math.round((cancelled.length / totalClosed) * 100);

  return NextResponse.json({
    period,
    from: start.toISO(),
    to: now.toISO(),
    metrics: {
      bookings: active.length,
      revenuePixCents: revenuePix,
      revenueServicesCents: revenueServices,
      ticketMedioCents,
      occupancyPct,
      noShowPct,
      cancelPct,
      novos,
      recorrentes,
    },
    byStatus,
    peakHours,
    byWeekday,
    topServices,
    topStaff,
    topCustomers,
  });
}
