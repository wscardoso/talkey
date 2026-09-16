"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPriceBRL } from "@/lib/formatters/br";
import { PLAN_FEATURE_LABELS, type PlanFeature } from "@/lib/billing/plans";

type PlanCard = {
  id: "starter" | "pro";
  label: string;
  description: string;
  priceLabel: string;
};

type CheckoutPayload = {
  paymentId: string;
  invoiceUrl: string | null;
  pixQrCode: string;
  pixCopyPaste: string;
  valueCents: number;
  dryRun: boolean;
  plan: "starter" | "pro";
  months: number;
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
  canCheckout?: boolean;
};

export function BillingBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blocked = searchParams.get("blocked") === "1";
  const upgrade = searchParams.get("upgrade") === "1";
  const featureParam = searchParams.get("feature");
  const featureLabel =
    featureParam && featureParam in PLAN_FEATURE_LABELS
      ? PLAN_FEATURE_LABELS[featureParam as PlanFeature]
      : null;
  const [state, setState] = useState<BillingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/billing");
    const data = await res.json();
    setState(data);
    setLoading(false);
    return data as BillingState;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!checkout) return;
    const id = window.setInterval(() => {
      void (async () => {
        const data = await load();
        if (data?.access?.allowed && data.tenant?.subscriptionEndsAt) {
          setCheckout(null);
          setMessage("Pagamento confirmado. Plano ativado.");
          router.replace("/app/agenda");
          router.refresh();
        }
      })();
    }, 4000);
    return () => window.clearInterval(id);
  }, [checkout, load, router]);

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

  const startCheckout = async (plan: "starter" | "pro") => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", plan, months: 1 }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.message ?? "Falha ao gerar PIX");
      return;
    }
    setCheckout(data.checkout as CheckoutPayload);
    if (data.checkout?.dryRun) {
      setMessage(
        "Modo demonstração (sem Asaas). Configure ASAAS_API_KEY para PIX real.",
      );
    }
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

      {upgrade && featureLabel && state.access.allowed ? (
        <p className="rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--copper)_14%,transparent)] px-4 py-3 text-sm text-[var(--copper)]">
          {featureLabel} faz parte do plano Pro. Faça upgrade para liberar.
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
                onClick={() => void startCheckout(plan.id)}
                className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold disabled:opacity-50"
              >
                Pagar com PIX
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void requestPlan(plan.id)}
                className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
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

      {checkout ? (
        <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
            PIX — {checkout.plan} ({formatPriceBRL(checkout.valueCents)})
          </h2>
          {checkout.pixQrCode.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={checkout.pixQrCode}
              alt="QR Code PIX"
              className="mx-auto h-48 w-48 rounded-xl bg-white p-2"
            />
          ) : (
            <p className="break-all rounded-xl border border-[var(--border)] bg-[var(--graphite)] p-3 font-mono text-xs">
              {checkout.pixCopyPaste}
            </p>
          )}
          <button
            type="button"
            className="min-h-11 w-full rounded-xl border border-[var(--border)] text-sm"
            onClick={() =>
              void navigator.clipboard.writeText(checkout.pixCopyPaste)
            }
          >
            Copiar código PIX
          </button>
          {checkout.invoiceUrl ? (
            <a
              href={checkout.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-[var(--copper)] underline"
            >
              Abrir fatura Asaas
            </a>
          ) : null}
          <p className="text-xs text-[var(--steel)]">
            Após o pagamento, a ativação é automática. Esta tela verifica a cada
            poucos segundos.
          </p>
          <button
            type="button"
            className="text-sm text-[var(--steel)] underline"
            onClick={() => setCheckout(null)}
          >
            Fechar
          </button>
        </section>
      ) : null}

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
      ) : null}

      {message ? (
        <p className="text-sm text-[color-mix(in_srgb,var(--copper)_90%,white)]">
          {message}
        </p>
      ) : null}
      {error ? <p className="text-sm text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
