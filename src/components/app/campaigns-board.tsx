"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Recipient = { id: string; name: string; phoneE164: string };
type SegmentOpt = { id: string; label: string };

const DEFAULT_MSG = `Oi {cliente}! Sentimos sua falta na *{barbearia}*.
Que tal agendar de novo?
{link}`;

export function CampaignsBoard() {
  const [segment, setSegment] = useState("inactive_30");
  const [segments, setSegments] = useState<SegmentOpt[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [count, setCount] = useState(0);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/app/campaigns?segment=${segment}`);
    const data = await res.json();
    setSegments(data.segments ?? []);
    setRecipients(data.recipients ?? []);
    setCount(data.count ?? 0);
    setHasWhatsApp(Boolean(data.hasWhatsApp));
    setLoading(false);
  }, [segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    if (
      !window.confirm(
        `Enviar para até ${Math.min(count, 40)} cliente(s)? (limite MVP: 40)`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/app/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, message }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Falha no disparo");
      return;
    }
    setInfo(
      `Enviados: ${data.sent} · Falhas: ${data.failed}${
        data.truncated ? " · (lista truncada em 40)" : ""
      }`,
    );
  };

  return (
    <div className="space-y-5">
      {!hasWhatsApp ? (
        <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,#ef4444_12%,transparent)] px-4 py-3 text-sm text-[#fca5a5]">
          WhatsApp desconectado.{" "}
          <Link href="/app/whatsapp" className="underline">
            Conectar
          </Link>
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Segmento
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={`min-h-10 rounded-xl px-3 text-sm ${
                segment === s.id
                  ? "bg-[var(--copper)] text-white"
                  : "border border-[var(--border)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--steel)]">
          {loading ? "Carregando…" : `${count} cliente(s) elegíveis`}
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Mensagem
        </h2>
        <textarea
          className="mt-3 min-h-36 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 py-2 text-sm outline-none ring-[var(--copper)] focus:ring-2"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-2 text-xs text-[var(--steel)]">
          Variáveis: {"{cliente}"} · {"{barbearia}"} · {"{link}"}
        </p>
        <button
          type="button"
          disabled={busy || loading || count === 0 || !hasWhatsApp}
          onClick={() => void send()}
          className="mt-4 min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Disparar campanha"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Prévia da lista
        </h2>
        <ul className="mt-2 max-h-64 space-y-1 overflow-auto text-sm">
          {recipients.length === 0 ? (
            <li className="text-[var(--steel)]">Nenhum destinatário</li>
          ) : (
            recipients.map((r) => (
              <li key={r.id} className="flex justify-between gap-2">
                <span className="truncate">{r.name}</span>
                <span className="shrink-0 text-[var(--steel)]">
                  {r.phoneE164}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {info ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--copper)_90%,white)]">
          {info}
        </p>
      ) : null}
      {error ? <p className="text-sm text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
