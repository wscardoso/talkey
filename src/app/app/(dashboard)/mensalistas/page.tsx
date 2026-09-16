import { requireOwnerSession } from "@/lib/auth/require-owner";
import { MembershipsBoard } from "@/components/app/memberships-board";

export default async function MensalistasPage() {
  await requireOwnerSession({ feature: "memberships" });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Mensalistas
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Planos de assinatura e clientes vinculados.
        </p>
      </header>
      <MembershipsBoard />
    </div>
  );
}
