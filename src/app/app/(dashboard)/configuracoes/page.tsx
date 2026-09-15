import { SettingsForm } from "@/components/app/settings-form";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Dados da barbearia, marca, políticas de agenda e depósito.
        </p>
      </header>
      <SettingsForm />
    </div>
  );
}
