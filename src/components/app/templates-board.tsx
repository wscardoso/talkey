"use client";

import { useCallback, useEffect, useState } from "react";

type Template = {
  key: string;
  label: string;
  body: string;
  isActive: boolean;
  defaultBody: string;
};

const textareaClass =
  "min-h-48 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 py-2 font-mono text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function TemplatesBoard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("booking_created");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/templates");
    const data = await res.json();
    const list = (data.templates ?? []) as Template[];
    setTemplates(list);
    setVariables(data.variables ?? []);
    const current =
      list.find((t) => t.key === selected) ?? list[0] ?? null;
    if (current) {
      setSelected(current.key);
      setBody(current.body);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const selectKey = (key: string) => {
    const t = templates.find((x) => x.key === key);
    setSelected(key);
    if (t) setBody(t.body);
    setMessage(null);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/templates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: selected, body }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar o template");
      return;
    }
    setMessage("Template salvo");
    setTemplates((list) =>
      list.map((t) => (t.key === selected ? { ...t, body } : t)),
    );
  };

  const restore = () => {
    const t = templates.find((x) => x.key === selected);
    if (t) setBody(t.defaultBody);
  };

  if (loading) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  const active = templates.find((t) => t.key === selected);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectKey(t.key)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${
              t.key === selected
                ? "bg-[var(--copper)] text-[var(--offwhite)]"
                : "border border-[var(--border)] bg-[var(--lead)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
            {active?.label ?? "Template"}
          </h2>
          <button
            type="button"
            onClick={restore}
            className="text-xs text-[var(--steel)] underline"
          >
            Restaurar padrão
          </button>
        </div>
        <textarea
          className={textareaClass}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="mt-2 text-xs text-[var(--steel)]">
          Variáveis: {variables.join(" · ")}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="mt-4 min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar template"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Pré-visualização
        </h2>
        <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-[var(--offwhite)]">
          {body
            .replaceAll("{cliente}", "João Silva")
            .replaceAll("{servico}", "Corte + Barba")
            .replaceAll("{profissional}", "Carlos")
            .replaceAll("{barbearia}", "Seu salão")
            .replaceAll("{endereco}", "Av. Exemplo, 100")
            .replaceAll("{quando}", "15/09/2026 às 14:00")}
        </pre>
      </section>

      {message ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--copper)_90%,white)]">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
