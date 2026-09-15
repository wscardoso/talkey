"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PlanCard = {
  id: "starter" | "pro";
  label: string;
  description: string;
  priceLabel: string;
};

type BillingState = {
  access: {
    allowed: boolean;
    plan: string;
    daysLeft: number | null;
    message: string;
    reason: string;
  };
  tenant: {
    name: string;
    slug: string;
    plan: string;
    trialEndsAt: string | null;
    subscriptionEndsAt: string | null;
  } | null;
  plans: PlanCard[];
  canSelfActivate: boolean;
};

export function BillingBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blocked = searchParams.get("blocked") === "1";
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/billing");
    const data = await res.json();
    setState(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const requestPlan = async (plan: "starter" | "pro") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request", plan }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Falha ao solicitar");
      return;
    }
    setMessage(data.message ?? "Pedido enviado");
  };

  const activate = async (plan: "starter" | "pro") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "activate",
        plan,
        months: 1,
        secret,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Não foi possível ativar");
      return;
    }
    setMessage("Plano ativado");
    await load();
    router.replace("/app/agenda");
    router.refresh();
  };

  if (loading || !state) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em]">
          Assinatura
        </h1>
        <p className="mt-1 text-sm text-[var(--steel)]">
          Plano, trial e renovação da conta.
        </p>
      </header>

      {blocked || !state.access.allowed ? (
        <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,#ef4444_12%,transparent)] px-4 py-3 text-sm text-[#fca5a5]">
          {state.access.message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--steel)]">
          Situação atual
        </p>
        <p className="mt-2 text-lg font-medium capitalize">{state.access.plan}</p>
        <p className="mt-1 text-sm text-[var(--steel)]">{state.access.message}</p>
        {state.access.daysLeft != null && state.access.allowed ? (
          <p className="mt-2 text-sm">
            {state.access.daysLeft} dia(s) restante(s)
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        {state.plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{plan.label}</h2>
                <p className="mt-1 text-sm text-[var(--steel)]">
                  {plan.description}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[var(--copper)]">
                {plan.priceLabel}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestPlan(plan.id)}
                className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                Solicitar {plan.label}
              </button>
              {state.canSelfActivate ? (
                <button
                  type="button"
                  disabled={busy || !secret}
                  onClick={() => void activate(plan.id)}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
                >
                  Ativar com código
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      {state.canSelfActivate ? (
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--steel)]">
            Código de ativação
          </span>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2"
            placeholder="BILLING_ACTIVATE_SECRET"
          />
        </label>
      ) : (
        <p className="text-xs text-[var(--steel)]">
          Checkout automático (Asaas) chega na próxima iteração. Por enquanto,
          solicite o plano e confirme o pagamento com a equipe Trato.
        </p>
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
