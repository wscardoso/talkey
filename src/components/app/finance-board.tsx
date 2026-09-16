"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPriceBRL } from "@/lib/formatters/br";

type PayRow = {
  id: string;
  status: string;
  amountCents: number;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  bookingStatus: string;
  startsAt: string;
  createdAt: string;
};

type FailRow = {
  id: string;
  event: string;
  status: string;
  error: string | null;
  toE164: string;
  channel: string;
  bookingId: string | null;
  createdAt: string;
};

export function FinanceBoard() {
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<PayRow[]>([]);
  const [failures, setFailures] = useState<FailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = status ? `?status=${status}` : "";
    const res = await fetch(`/api/app/finance${qs}`);
    const data = await res.json();
    setRows(data.payments ?? []);
    setFailures(data.notificationFailures ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {failures.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
            Falhas recentes (WhatsApp)
          </h2>
          <ul className="space-y-2">
            {failures.slice(0, 8).map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-[color-mix(in_srgb,#fca5a5_35%,var(--border))] bg-[var(--lead)] p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{f.event}</p>
                  <span className="text-xs uppercase text-[#fca5a5]">
                    {f.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--steel)]">
                  {f.toE164} · {f.channel}
                  {f.bookingId ? ` · booking ${f.bookingId.slice(0, 8)}…` : ""}
                </p>
                {f.error ? (
                  <p className="mt-1 text-xs text-[#fca5a5]">{f.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Sinais PIX
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "", label: "Todos" },
            { id: "PENDING", label: "Pendentes" },
            { id: "PAID", label: "Pagos" },
            { id: "FAILED", label: "Expirados/falha" },
          ].map((f) => (
            <button
              key={f.id || "all"}
              type="button"
              onClick={() => setStatus(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                status === f.id
                  ? "bg-[var(--copper)] text-white"
                  : "bg-[var(--lead)] text-[var(--steel)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--steel)]">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--steel)]">
            Nenhum sinal PIX neste filtro. Ative depósito nas configurações do
            tenant e faça um agendamento.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3 text-sm"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{p.customerName}</p>
                  <p className="text-[var(--copper)]">
                    {formatPriceBRL(p.amountCents)}
                  </p>
                </div>
                <p className="text-xs text-[var(--steel)]">
                  {p.serviceName} · PIX {p.status} · agenda {p.bookingStatus}
                </p>
                <a
                  className="mt-2 inline-block text-xs text-[var(--signal)]"
                  href={`https://wa.me/${p.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Oi! Segue o lembrete do sinal PIX do seu horário.")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Reenviar no WhatsApp
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
