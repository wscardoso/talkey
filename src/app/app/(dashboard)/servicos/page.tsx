import { ServicesBoard } from "@/components/app/services-board";

export default function ServicosPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Serviços
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Cadastre cortes, barbas e combos com duração e preço.
        </p>
      </header>
      <ServicesBoard />
    </div>
  );
}
