"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { TratoMark } from "@/components/brand/trato-mark";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("dono@domcarlos.local");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        billing?: { allowed?: boolean };
      };
      if (!res.ok) {
        setError(data.message ?? "Falha no login");
        return;
      }
      const next = searchParams.get("next") || "/app/agenda";
      const dest =
        data.billing && data.billing.allowed === false
          ? "/app/assinatura?blocked=1"
          : next.startsWith("/app")
            ? next
            : "/app/agenda";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--graphite)] px-5 py-10 text-[var(--offwhite)]">
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
          <TratoMark className="h-10 w-10 text-[var(--copper)]" />
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-[0.2em]">
            TRATO
          </h1>
          <p className="text-sm text-[var(--steel)]">
            Acesso do dono — agenda e operação do dia
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-6"
        >
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              E-mail
            </span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-4 text-base text-[var(--offwhite)] outline-none ring-[var(--copper)] focus:ring-2"
            />
          </label>
          <div className="space-y-2">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
                Senha
              </span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-4 pr-12 text-base text-[var(--offwhite)] outline-none ring-[var(--copper)] focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--steel)] hover:text-[var(--offwhite)]"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" strokeWidth={1.8} />
                  ) : (
                    <Eye className="h-5 w-5" strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </label>
            <div className="flex justify-end">
              <Link
                href="/app/recuperar-senha"
                className="text-sm text-[var(--steel)] transition hover:text-[var(--copper)]"
              >
                Recuperar senha
              </Link>
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-[color-mix(in_srgb,#ef4444_18%,transparent)] px-3 py-2 text-sm text-[#fca5a5]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--copper)] text-sm font-semibold tracking-wide text-[var(--offwhite)] transition enabled:active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
