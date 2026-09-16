import { StaffBoard } from "@/components/app/staff-board";
import { InvitesBoard } from "@/components/app/invites-board";

export default function EquipePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Equipe
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Quem atende, serviços que cada um faz e horários de atendimento.
        </p>
      </header>
      <InvitesBoard />
      <StaffBoard />
    </div>
  );
}
