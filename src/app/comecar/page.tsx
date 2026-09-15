"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TratoMark } from "@/components/brand/trato-mark";
import { slugifyTenantName } from "@/lib/slugify";

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-4 text-base text-[var(--offwhite)] outline-none ring-[var(--copper)] focus:ring-2";

export default function ComecarPage() {
  const router = useRouter();
  const [salonName, setSalonName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestedSlug = useMemo(
    () => slugifyTenantName(salonName),
    [salonName],
  );

  const onSalonNameChange = (value: string) => {
    setSalonName(value);
    if (!slugTouched) setSlug(slugifyTenantName(value));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName,
          slug: slug || suggestedSlug,
          ownerName,
          email,
          password,
          phone: phone || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.message ?? "Não foi possível criar a conta");
        return;
      }
      router.replace("/app/servicos");
      router.refresh();
    } catch {
      setError("Não foi possível conectar. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-dvh bg-[var(--graphite)] px-5 py-10 text-[var(--offwhite)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -5%, color-mix(in srgb, var(--copper) 22%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <TratoMark className="h-10 w-10 text-[var(--copper)]" />
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[0.18em]">
            COMEÇAR
          </h1>
          <p className="text-sm text-[var(--steel)]">
            Crie sua conta — 30 dias grátis para configurar e atender.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-6"
        >
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              Nome do negócio
            </span>
            <input
              required
              value={salonName}
              onChange={(e) => onSalonNameChange(e.target.value)}
              className={inputClass}
              placeholder="Ex.: Studio Yara"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              Link público
            </span>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs text-[var(--steel)]">
                /agendar/
              </span>
              <input
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className={inputClass}
                placeholder="studio-yara"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              Seu nome
            </span>
            <input
              required
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              E-mail
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              Senha
            </span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
              WhatsApp (opcional)
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              placeholder="(31) 99999-0000"
            />
            <span className="text-xs text-[var(--steel)]">
              Se informar, enviamos a mensagem de boas-vindas com seus links.
            </span>
          </label>

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
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--steel)]">
          Já tem conta?{" "}
          <Link href="/app/login" className="text-[var(--copper)] underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
