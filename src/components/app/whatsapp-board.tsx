"use client";

import { useCallback, useEffect, useState } from "react";

type WaState = {
  configured: boolean;
  connected: boolean;
  hasInstance: boolean;
  status: string;
  owner: string | null;
  profileName: string | null;
  qrcode: string | null;
  paircode: string | null;
  whatsappE164: string | null;
  error?: string;
};

function qrSrc(qrcode: string | null): string | null {
  if (!qrcode) return null;
  if (qrcode.startsWith("data:")) return qrcode;
  if (qrcode.startsWith("http")) return qrcode;
  return `data:image/png;base64,${qrcode}`;
}

export function WhatsAppBoard() {
  const [state, setState] = useState<WaState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/whatsapp");
    const data = (await res.json()) as WaState;
    setState(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!state || state.connected || state.status === "none") return;
    const id = window.setInterval(() => {
      void load();
    }, 4000);
    return () => window.clearInterval(id);
  }, [state, load]);

  const run = async (action: "init" | "connect" | "disconnect" | "refresh") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? data.error ?? "Falha na operação");
      return;
    }
    setMessage(
      action === "disconnect"
        ? "Desconectado"
        : "Escaneie o QR no WhatsApp (Aparelhos conectados)",
    );
    await load();
    if (data.qrcode || data.paircode) {
      setState((s) =>
        s
          ? {
              ...s,
              qrcode: data.qrcode ?? s.qrcode,
              paircode: data.paircode ?? s.paircode,
              status: data.status ?? s.status,
              owner: data.owner ?? s.owner,
              profileName: data.profileName ?? s.profileName,
            }
          : s,
      );
    }
  };

  if (loading || !state) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  const img = qrSrc(state.qrcode);
  const statusLabel =
    state.status === "connected"
      ? "Conectado"
      : state.status === "connecting"
        ? "Conectando…"
        : state.status === "none"
          ? "Sem instância"
          : state.status || "Desconectado";

  return (
    <div className="space-y-5">
      {!state.configured ? (
        <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,#ef4444_12%,transparent)] px-4 py-3 text-sm text-[#fca5a5]">
          Servidor sem UAZAPI_BASE_URL / UAZAPI_ADMIN_TOKEN. Configure no Coolify
          para habilitar o QR.
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--steel)]">
              Status
            </p>
            <p className="mt-1 text-lg font-medium">{statusLabel}</p>
            {state.profileName || state.owner ? (
              <p className="mt-1 text-sm text-[var(--steel)]">
                {[state.profileName, state.owner].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              state.connected
                ? "bg-[color-mix(in_srgb,#22c55e_22%,transparent)] text-[#86efac]"
                : "bg-[color-mix(in_srgb,#ef4444_18%,transparent)] text-[#fca5a5]"
            }`}
          >
            {state.connected ? "Online" : "Offline"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!state.hasInstance ? (
            <button
              type="button"
              disabled={busy || !state.configured}
              onClick={() => void run("init")}
              className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Criando…" : "Conectar WhatsApp"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || !state.configured}
                onClick={() => void run("connect")}
                className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                {busy ? "Gerando…" : "Gerar QR Code"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("refresh")}
                className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                Atualizar status
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run("disconnect")}
                className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[#fca5a5] disabled:opacity-50"
              >
                Desconectar
              </button>
            </>
          )}
        </div>
      </section>

      {(img || state.paircode) && !state.connected ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
            Escaneie o QR
          </h2>
          <p className="mt-1 text-sm text-[var(--steel)]">
            No celular: WhatsApp → Aparelhos conectados → Conectar aparelho.
          </p>
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt="QR Code WhatsApp"
              className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-2"
            />
          ) : null}
          {state.paircode ? (
            <p className="mt-3 text-center text-sm">
              Código de pareamento:{" "}
              <span className="font-mono tracking-wider">{state.paircode}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--copper)_90%,white)]">
          {message}
        </p>
      ) : null}
      {error || state.error ? (
        <p className="text-sm text-[#fca5a5]">{error ?? state.error}</p>
      ) : null}
    </div>
  );
}
