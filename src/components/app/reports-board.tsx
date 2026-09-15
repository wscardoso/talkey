"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPriceBRL } from "@/lib/formatters/br";

type Metrics = {
  bookings: number;
  revenuePixCents: number;
  revenueServicesCents: number;
  ticketMedioCents: number;
  occupancyPct: number;
  noShowPct: number;
  cancelPct: number;
  novos: number;
  recorrentes: number;
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmados",
  CHECKED_IN: "Check-in",
  COMPLETED: "Concluídos",
  CANCELLED: "Cancelados",
  NO_SHOW: "No-show",
  PENDING_PAYMENT: "Aguardando PIX",
};

export function ReportsBoard() {
  const [period, setPeriod] = useState("7d");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [peakHours, setPeakHours] = useState<
    Array<{ label: string; count: number }>
  >([]);
  const [byWeekday, setByWeekday] = useState<
    Array<{ day: string; count: number }>
  >([]);
  const [topServices, setTopServices] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [topStaff, setTopStaff] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [topCustomers, setTopCustomers] = useState<
    Array<{ name: string; count: number }>
  >([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/app/reports?period=${period}`);
    const data = await res.json();
    setMetrics(data.metrics ?? null);
    setByStatus(data.byStatus ?? {});
    setPeakHours(data.peakHours ?? []);
    setByWeekday(data.byWeekday ?? []);
    setTopServices(data.topServices ?? []);
    setTopStaff(data.topStaff ?? []);
    setTopCustomers(data.topCustomers ?? []);
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxWeekday = Math.max(1, ...byWeekday.map((d) => d.count));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[
          { id: "today", label: "Hoje" },
          { id: "7d", label: "7 dias" },
          { id: "30d", label: "30 dias" },
          { id: "90d", label: "90 dias" },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              period === p.id
                ? "bg-[var(--copper)] text-white"
                : "bg-[var(--lead)] text-[var(--steel)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {metrics ? (
        <div className="grid grid-cols-2 gap-3">
          <Card label="Agendamentos" value={String(metrics.bookings)} />
          <Card
            label="Ticket médio"
            value={formatPriceBRL(metrics.ticketMedioCents)}
          />
          <Card
            label="Receita sinal PIX"
            value={formatPriceBRL(metrics.revenuePixCents)}
          />
          <Card
            label="Receita serviços"
            value={formatPriceBRL(metrics.revenueServicesCents)}
          />
          <Card label="Ocupação" value={`${metrics.occupancyPct}%`} />
          <Card label="No-show" value={`${metrics.noShowPct}%`} />
          <Card label="Cancelamentos" value={`${metrics.cancelPct}%`} />
          <Card label="Novos" value={String(metrics.novos)} />
          <Card label="Recorrentes" value={String(metrics.recorrentes)} />
        </div>
      ) : (
        <p className="text-sm text-[var(--steel)]">Carregando…</p>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-medium text-[var(--steel)]">Por status</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {Object.entries(byStatus)
            .filter(([, n]) => n > 0)
            .map(([status, count]) => (
              <li key={status} className="flex justify-between">
                <span>{STATUS_LABELS[status] ?? status}</span>
                <span className="text-[var(--steel)]">{count}</span>
              </li>
            ))}
          {Object.values(byStatus).every((n) => n === 0) ? (
            <li className="text-[var(--steel)]">Sem dados no período</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-medium text-[var(--steel)]">
          Pico de horários
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          {peakHours.length === 0 ? (
            <li className="text-[var(--steel)]">Sem dados</li>
          ) : (
            peakHours.map((h) => (
              <li key={h.label} className="flex justify-between">
                <span>{h.label}</span>
                <span className="text-[var(--steel)]">{h.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-medium text-[var(--steel)]">Por dia da semana</h2>
        <div className="mt-3 flex items-end gap-2">
          {byWeekday.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[var(--copper)]"
                style={{
                  height: `${Math.max(4, Math.round((d.count / maxWeekday) * 64))}px`,
                }}
                title={`${d.count}`}
              />
              <span className="text-[10px] text-[var(--steel)]">{d.day}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--steel)]">Top clientes</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {topCustomers.length === 0 ? (
            <li className="text-[var(--steel)]">Sem dados</li>
          ) : (
            topCustomers.map((c) => (
              <li key={`${c.name}-${c.count}`} className="flex justify-between">
                <span className="truncate pr-2">{c.name}</span>
                <span className="text-[var(--steel)]">{c.count}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--steel)]">Top serviços</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {topServices.map((s) => (
            <li key={s.name} className="flex justify-between">
              <span>{s.name}</span>
              <span className="text-[var(--steel)]">{s.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--steel)]">Top equipe</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {topStaff.map((s) => (
            <li key={s.name} className="flex justify-between">
              <span>{s.name}</span>
              <span className="text-[var(--steel)]">{s.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--steel)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--offwhite)]">
        {value}
      </p>
    </div>
  );
}
