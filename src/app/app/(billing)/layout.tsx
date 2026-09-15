import Link from "next/link";
import { requireOwnerSession } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/app/logout-button";

export default async function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOwnerSession({ allowExpiredBilling: true });
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { name: true },
  });

  return (
    <div className="min-h-dvh bg-[var(--graphite)] text-[var(--offwhite)]">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 70% 35% at 50% -8%, color-mix(in srgb, var(--copper) 16%, transparent), transparent 50%), linear-gradient(180deg, var(--graphite), color-mix(in srgb, var(--lead) 55%, var(--graphite)))",
        }}
        aria-hidden
      />

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--graphite)_88%,transparent)] px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/app/assinatura"
              className="font-[family-name:var(--font-display)] text-xl tracking-[0.18em] text-[var(--copper)]"
            >
              TALKEY
            </Link>
            <p className="truncate text-xs text-[var(--steel)]">
              {tenant?.name ?? "Assinatura"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
