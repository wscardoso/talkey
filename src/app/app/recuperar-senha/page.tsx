import Link from "next/link";
import { TalkeyMark } from "@/components/brand/talkey-mark";

export default function RecuperarSenhaPage() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-[var(--graphite)] px-5 py-10 text-[var(--offwhite)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -5%, color-mix(in srgb, var(--copper) 22%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <TalkeyMark className="h-10 w-10 text-[var(--copper)]" />
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-[0.2em]">
            TALKEY
          </h1>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
            Recuperar senha
          </h2>
          <p className="text-sm leading-relaxed text-[var(--steel)]">
            A redefinição automática ainda não está disponível. Peça ao suporte
            Talkey ou a quem configurou sua conta para gerar uma nova senha.
          </p>
          <Link
            href="/app/login"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--copper)] text-sm font-semibold tracking-wide text-[var(--offwhite)] transition active:scale-[0.98]"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
