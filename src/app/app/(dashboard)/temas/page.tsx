import { requireOwnerSession } from "@/lib/auth/require-owner";
import { ThemesBoard } from "@/components/app/themes-board";

export default async function TemasPage() {
  await requireOwnerSession({ feature: "themes" });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Temas
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Escolha o pack que combina com a casa, ajuste a cor e o logo.
        </p>
      </header>
      <ThemesBoard />
    </div>
  );
}
