import { Suspense } from "react";
import { BillingBoard } from "@/components/app/billing-board";

export default function AssinaturaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--steel)]">Carregando…</p>}>
      <BillingBoard />
    </Suspense>
  );
}
