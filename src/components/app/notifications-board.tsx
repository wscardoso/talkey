"use client";

import { useCallback, useEffect, useState } from "react";

type Pref = { event: string; label: string; enabled: boolean };

export function NotificationsBoard() {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/notifications");
    const data = await res.json();
    setPrefs(data.preferences ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (event: string, enabled: boolean) => {
    setError(null);
    setMessage(null);
    setPrefs((list) =>
      list.map((p) => (p.event === event ? { ...p, enabled } : p)),
    );
    const res = await fetch("/api/app/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, enabled }),
    });
    if (!res.ok) {
      setError("Não foi possível salvar");
      await load();
      return;
    }
    setMessage("Preferências salvas");
  };

  if (loading) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Enviado ao cliente
        </h2>
        <ul className="mt-3 space-y-3">
          {prefs.map((p) => (
            <li
              key={p.event}
              className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm">{p.label}</span>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => void toggle(p.event, e.target.checked)}
                  className="h-4 w-4 accent-[var(--copper)]"
                />
                {p.enabled ? "On" : "Off"}
              </label>
            </li>
          ))}
        </ul>
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
