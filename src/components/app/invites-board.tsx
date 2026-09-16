"use client";

import { useCallback, useEffect, useState } from "react";

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "MANAGER";
  expiresAt: string;
  createdAt: string;
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function InvitesBoard() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"OWNER" | "MANAGER">("MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/app/invites");
    const data = await res.json();
    setInvites(data.invites ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError(null);
    setCopied(false);
    const res = await fetch("/api/app/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, name: name || undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.message ?? "Não foi possível criar o convite");
      return;
    }
    setLastLink(data.inviteUrl ?? null);
    setEmail("");
    setName("");
    await load();
  };

  const revoke = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/app/invites/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message ?? "Falha ao revogar");
      return;
    }
    await load();
  };

  const copyLink = async () => {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
    setCopied(true);
  };

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--ink)]/40 p-4">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[0.06em]">
          Convites
        </h2>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Convide OWNER ou MANAGER com link válido por 7 dias. Copie e envie
          manualmente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--steel)]">E-mail</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="gerente@email.com"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--steel)]">Nome (opcional)</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do convidado"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--steel)]">Papel</span>
          <select
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value as "OWNER" | "MANAGER")}
          >
            <option value="MANAGER">MANAGER</option>
            <option value="OWNER">OWNER</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={saving || !email}
            onClick={() => void create()}
            className="min-h-11 w-full rounded-xl bg-[var(--copper)] px-4 text-sm font-medium text-[var(--ink)] disabled:opacity-50"
          >
            {saving ? "Criando…" : "Criar convite"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {lastLink ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--graphite)] p-3 sm:flex-row sm:items-center">
          <code className="flex-1 break-all text-xs text-[var(--steel)]">
            {lastLink}
          </code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="min-h-10 rounded-lg border border-[var(--border)] px-3 text-sm"
          >
            {copied ? "Copiado" : "Copiar link"}
          </button>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--steel)]">Pendentes</h3>
        {loading ? (
          <p className="text-sm text-[var(--steel)]">Carregando…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-[var(--steel)]">Nenhum convite pendente.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-xs text-[var(--steel)]">
                    {inv.role} · expira{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(inv.id)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs"
                >
                  Revogar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
