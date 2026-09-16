"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Peek = {
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
  tenant: { name: string; slug: string };
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [peek, setPeek] = useState<Peek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.message ?? "Convite inválido");
        return;
      }
      setPeek(data);
      if (data.name) setName(data.name);
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Não foi possível aceitar o convite");
      return;
    }
    router.push("/app/agenda");
    router.refresh();
  };

  if (loading) {
    return <p className="text-sm text-[var(--steel)]">Validando convite…</p>;
  }

  if (!peek) {
    return (
      <p className="text-sm text-red-400">{error ?? "Convite indisponível"}</p>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--graphite)] p-4 text-sm">
        <p>
          Você foi convidado para{" "}
          <strong>{peek.tenant.name}</strong> como <strong>{peek.role}</strong>.
        </p>
        <p className="mt-1 text-[var(--steel)]">{peek.email}</p>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--steel)]">Seu nome</span>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-[var(--steel)]">Senha</span>
        <input
          className={inputClass}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="min-h-11 w-full rounded-xl bg-[var(--copper)] px-4 text-sm font-medium text-[var(--ink)] disabled:opacity-50"
      >
        {saving ? "Entrando…" : "Criar conta e entrar"}
      </button>
    </form>
  );
}
