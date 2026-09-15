"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPriceBRL } from "@/lib/formatters/br";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  bufferAfterMin: number;
  priceCents: number;
  category: string | null;
  isActive: boolean;
  requiresDeposit: boolean;
  sortOrder: number;
};

const emptyForm = {
  name: "",
  description: "",
  durationMin: 40,
  bufferAfterMin: 0,
  priceReais: "35",
  category: "",
  requiresDeposit: false,
  isActive: true,
};

export function ServicesBoard() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/app/services");
    const data = await res.json();
    setRows(data.services ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setCreating(true);
  };

  const openEdit = (s: ServiceRow) => {
    setCreating(false);
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMin: s.durationMin,
      bufferAfterMin: s.bufferAfterMin,
      priceReais: (s.priceCents / 100).toFixed(2).replace(".", ","),
      category: s.category ?? "",
      requiresDeposit: s.requiresDeposit,
      isActive: s.isActive,
    });
    setError(null);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const priceToCents = (raw: string) => {
    const normalized = raw.replace(/\s/g, "").replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  };

  const save = async () => {
    const priceCents = priceToCents(form.priceReais);
    if (priceCents === null) {
      setError("Preço inválido");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description,
      durationMin: form.durationMin,
      bufferAfterMin: form.bufferAfterMin,
      priceCents,
      category: form.category,
      requiresDeposit: form.requiresDeposit,
      isActive: form.isActive,
    };

    const res = editing
      ? await fetch(`/api/app/services/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/app/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Não foi possível salvar");
      return;
    }
    close();
    await load();
  };

  const deactivate = async (s: ServiceRow) => {
    const res = await fetch(`/api/app/services/${s.id}`, { method: "DELETE" });
    if (!res.ok) return;
    await load();
  };

  const modalOpen = creating || editing;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openCreate}
        className="rounded-xl bg-[var(--copper)] px-4 py-2.5 text-sm font-semibold text-[var(--graphite)]"
      >
        Novo serviço
      </button>

      {loading ? (
        <p className="text-sm text-[var(--steel)]">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--steel)]">
          Nenhum serviço ainda. Cadastre o primeiro para o link de agendamento
          funcionar.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => openEdit(s)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {s.name}
                    {!s.isActive ? (
                      <span className="ml-2 text-xs text-[var(--steel)]">
                        inativo
                      </span>
                    ) : null}
                  </p>
                  <span className="text-sm text-[var(--copper)]">
                    {formatPriceBRL(s.priceCents)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--steel)]">
                  {s.durationMin} min
                  {s.category ? ` · ${s.category}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--graphite)] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editing ? "Editar serviço" : "Novo serviço"}
              </h2>
              <button
                type="button"
                className="text-sm text-[var(--steel)]"
                onClick={close}
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Descrição">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  className={inputClass}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Duração (min)">
                  <input
                    type="number"
                    min={5}
                    value={form.durationMin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationMin: Number(e.target.value),
                      }))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Preço (R$)">
                  <input
                    value={form.priceReais}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priceReais: e.target.value }))
                    }
                    className={inputClass}
                    inputMode="decimal"
                  />
                </Field>
              </div>
              <Field label="Categoria">
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requiresDeposit}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      requiresDeposit: e.target.checked,
                    }))
                  }
                />
                Exige sinal/depósito
              </label>
              {editing ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  Ativo no agendamento
                </label>
              ) : null}
            </div>

            {error ? (
              <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-[var(--copper)] px-3 py-2 text-sm font-medium text-[var(--graphite)] disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => void deactivate(editing)}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--steel)]"
                >
                  {editing.isActive ? "Desativar" : "Remover"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";
