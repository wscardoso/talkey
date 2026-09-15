import { StaffBoard } from "@/components/app/staff-board";

export default function EquipePage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Equipe
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Barbeiros, serviços que cada um faz e horários de atendimento.
        </p>
      </header>
      <StaffBoard />
    </div>
  );
}
