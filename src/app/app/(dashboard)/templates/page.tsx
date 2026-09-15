import { TemplatesBoard } from "@/components/app/templates-board";

export default function TemplatesPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Templates
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Personalize as mensagens automáticas enviadas aos clientes.
        </p>
      </header>
      <TemplatesBoard />
    </div>
  );
}
