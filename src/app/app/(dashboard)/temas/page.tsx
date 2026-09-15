import { ThemesBoard } from "@/components/app/themes-board";

export default function TemasPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Temas
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Cor, logo e aparência da página de agendamento.
        </p>
      </header>
      <ThemesBoard />
    </div>
  );
}
