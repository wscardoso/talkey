"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPriceBRL } from "@/lib/formatters/br";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationDays: number;
  visitLimit: number | null;
  serviceIds: string[];
  isActive: boolean;
  membersCount: number;
};

type Membership = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  visitsUsed: number;
  visitLimit: number | null;
  customer: { id: string; name: string; phoneE164: string };
  plan: { id: string; name: string; priceCents: number };
};

type CustomerOpt = { id: string; name: string; phoneE164: string };
type ServiceOpt = { id: string; name: string };

const inputClass =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function MembershipsBoard() {
  const [tab, setTab] = useState<"members" | "plans">("members");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    revenueActiveCents: 0,
    expiring7d: 0,
  });
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [services, setServices] = useState<ServiceOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("99,90");
  const [planDays, setPlanDays] = useState("30");
  const [planVisits, setPlanVisits] = useState("");
  const [planServices, setPlanServices] = useState<string[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [planId, setPlanId] = useState("");

  const load = useCallback(async () => {
    const [plansRes, memRes, custRes, svcRes] = await Promise.all([
      fetch("/api/app/membership-plans"),
      fetch("/api/app/memberships"),
      fetch("/api/app/customers"),
      fetch("/api/app/services"),
    ]);
    const plansData = await plansRes.json();
    const memData = await memRes.json();
    const custData = await custRes.json();
    const svcData = await svcRes.json();
    const nextPlans: Plan[] = plansData.plans ?? [];
    setPlans(nextPlans);
    setMemberships(memData.memberships ?? []);
    setStats(
      memData.stats ?? {
        active: 0,
        pending: 0,
        revenueActiveCents: 0,
        expiring7d: 0,
      },
    );
    setCustomers(custData.customers ?? []);
    setServices(svcData.services ?? []);
    setPlanId((current) => current || nextPlans.find((p) => p.isActive)?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parsePrice = (raw: string) => {
    const n = Number(raw.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  };

  const createPlan = async () => {
    setError(null);
    setMessage(null);
    const priceCents = parsePrice(planPrice);
    if (!Number.isFinite(priceCents)) {
      setError("Preço inválido");
      return;
    }
    const res = await fetch("/api/app/membership-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: planName,
        priceCents,
        durationDays: Number(planDays) || 30,
        visitLimit: planVisits ? Number(planVisits) : null,
        serviceIds: planServices,
      }),
    });
    if (!res.ok) {
      setError("Não foi possível criar o plano");
      return;
    }
    setPlanName("");
    setMessage("Plano criado");
    await load();
  };

  const linkMember = async () => {
    setError(null);
    setMessage(null);
    if (!customerId || !planId) {
      setError("Selecione cliente e plano");
      return;
    }
    const res = await fetch("/api/app/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, planId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Falha ao vincular");
      return;
    }
    setMessage("Mensalista vinculado");
    await load();
  };

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/app/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  const bumpVisit = async (m: Membership) => {
    await fetch("/api/app/memberships", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, visitsUsed: m.visitsUsed + 1 }),
    });
    await load();
  };

  if (loading) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ativos" value={String(stats.active)} />
        <Stat label="Pendentes" value={String(stats.pending)} />
        <Stat
          label="Receita ativa"
          value={formatPriceBRL(stats.revenueActiveCents)}
        />
        <Stat label="Expirando 7d" value={String(stats.expiring7d)} />
      </div>

      <div className="flex gap-2">
        {(
          [
            { id: "members", label: "Assinantes" },
            { id: "plans", label: "Planos" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-10 rounded-xl px-3 text-sm font-medium ${
              tab === t.id
                ? "bg-[var(--copper)] text-white"
                : "border border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "members" ? (
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
              Vincular cliente
            </h2>
            <select
              className={inputClass}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecione o cliente</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phoneE164}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="">Selecione o plano</option>
              {plans
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatPriceBRL(p.priceCents)}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={() => void linkMember()}
              className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold"
            >
              Vincular
            </button>
          </section>

          <ul className="space-y-2">
            {memberships.length === 0 ? (
              <li className="text-sm text-[var(--steel)]">
                Nenhum mensalista ainda
              </li>
            ) : (
              memberships.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{m.customer.name}</p>
                      <p className="text-xs text-[var(--steel)]">
                        {m.plan.name} · {m.status}
                      </p>
                      <p className="mt-1 text-xs text-[var(--steel)]">
                        Até {new Date(m.endsAt).toLocaleDateString("pt-BR")} ·
                        usos {m.visitsUsed}
                        {m.visitLimit != null ? `/${m.visitLimit}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void bumpVisit(m)}
                        className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs"
                      >
                        +1 uso
                      </button>
                      {m.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => void setStatus(m.id, "CANCELLED")}
                          className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[#fca5a5]"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
              Novo plano
            </h2>
            <input
              className={inputClass}
              placeholder="Nome do plano"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                className={inputClass}
                placeholder="Preço"
                value={planPrice}
                onChange={(e) => setPlanPrice(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Dias"
                value={planDays}
                onChange={(e) => setPlanDays(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Limite usos"
                value={planVisits}
                onChange={(e) => setPlanVisits(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[var(--steel)]">
                Serviços incluídos (opcional)
              </p>
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const on = planServices.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setPlanServices((ids) =>
                          on ? ids.filter((x) => x !== s.id) : [...ids, s.id],
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs ${
                        on
                          ? "bg-[var(--copper)] text-white"
                          : "border border-[var(--border)]"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void createPlan()}
              className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold"
            >
              Criar plano
            </button>
          </section>

          <ul className="space-y-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4"
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-[var(--copper)]">
                      {formatPriceBRL(p.priceCents)} · {p.durationDays} dias
                    </p>
                    <p className="text-xs text-[var(--steel)]">
                      {p.visitLimit != null
                        ? `${p.visitLimit} usos`
                        : "Usos ilimitados"}{" "}
                      · {p.membersCount} assinante(s)
                      {!p.isActive ? " · inativo" : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--copper)_90%,white)]">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--lead)] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--steel)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
