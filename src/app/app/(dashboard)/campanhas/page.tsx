import { requireOwnerSession } from "@/lib/auth/require-owner";
import { CampaignsBoard } from "@/components/app/campaigns-board";

export default async function CampanhasPage() {
  await requireOwnerSession({ feature: "campaigns" });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Campanhas
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Reative clientes inativos com mensagem via WhatsApp.
        </p>
      </header>
      <CampaignsBoard />
    </div>
  );
}
