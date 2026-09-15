"use client";

import { useCallback, useEffect, useState } from "react";

type Settings = {
  slug: string;
  name: string;
  phone: string | null;
  whatsappE164: string | null;
  email: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  brandPrimary: string | null;
  logoUrl: string | null;
  timezone: string;
  slotIntervalMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  minLeadMin: number;
  maxAdvanceDays: number;
  cancelPolicyMin: number;
  depositRequired: boolean;
  depositPercent: number | null;
  depositFixedCents: number | null;
  paymentProvider: "NONE" | "ASAAS" | "STRIPE" | "PIX_MANUAL";
  waInstanceId: string | null;
  waProvider: string | null;
  plan: string;
  isActive: boolean;
  hasAsaasKey?: boolean;
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositFixedReais, setDepositFixedReais] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/app/settings");
    const data = await res.json();
    setSettings(data.settings ?? null);
    if (data.settings?.depositFixedCents != null) {
      setDepositFixedReais(
        (data.settings.depositFixedCents / 100).toFixed(2).replace(".", ","),
      );
    } else {
      setDepositFixedReais("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    let depositFixedCents: number | null = null;
    if (depositFixedReais.trim()) {
      const n = Number(depositFixedReais.replace(",", "."));
      if (!Number.isFinite(n) || n < 0) {
        setError("Valor fixo de depósito inválido");
        setSaving(false);
        return;
      }
      depositFixedCents = Math.round(n * 100);
    }

    const res = await fetch("/api/app/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: settings.name,
        phone: settings.phone,
        whatsappE164: settings.whatsappE164,
        email: settings.email ?? "",
        addressLine1: settings.addressLine1,
        city: settings.city,
        state: settings.state,
        brandPrimary: settings.brandPrimary || null,
        logoUrl: settings.logoUrl || "",
        slotIntervalMin: settings.slotIntervalMin,
        bufferBeforeMin: settings.bufferBeforeMin,
        bufferAfterMin: settings.bufferAfterMin,
        minLeadMin: settings.minLeadMin,
        maxAdvanceDays: settings.maxAdvanceDays,
        cancelPolicyMin: settings.cancelPolicyMin,
        depositRequired: settings.depositRequired,
        depositPercent: settings.depositPercent,
        depositFixedCents,
        paymentProvider: settings.paymentProvider,
        waInstanceId: settings.waInstanceId ?? "",
        waProvider: settings.waProvider ?? "",
      }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar as configurações");
      return;
    }
    setMessage("Configurações salvas");
    await load();
  };

  if (loading || !settings) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Barbearia
        </h2>
        <p className="text-xs text-[var(--steel)]">
          Link público: /agendar/{settings.slug} · plano {settings.plan}
        </p>
        <Field label="Nome">
          <input
            className={inputClass}
            value={settings.name}
            onChange={(e) => patch("name", e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone">
            <input
              className={inputClass}
              value={settings.phone ?? ""}
              onChange={(e) => patch("phone", e.target.value || null)}
            />
          </Field>
          <Field label="WhatsApp (E.164)">
            <input
              className={inputClass}
              value={settings.whatsappE164 ?? ""}
              onChange={(e) => patch("whatsappE164", e.target.value || null)}
              placeholder="+5533..."
            />
          </Field>
        </div>
        <Field label="E-mail">
          <input
            className={inputClass}
            type="email"
            value={settings.email ?? ""}
            onChange={(e) => patch("email", e.target.value || null)}
          />
        </Field>
        <Field label="Endereço">
          <input
            className={inputClass}
            value={settings.addressLine1 ?? ""}
            onChange={(e) => patch("addressLine1", e.target.value || null)}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Cidade">
            <input
              className={inputClass}
              value={settings.city ?? ""}
              onChange={(e) => patch("city", e.target.value || null)}
            />
          </Field>
          <Field label="UF">
            <input
              className={inputClass}
              maxLength={2}
              value={settings.state ?? ""}
              onChange={(e) => patch("state", e.target.value || null)}
            />
          </Field>
          <Field label="Cor da marca">
            <input
              type="color"
              className="h-12 w-full cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--graphite)]"
              value={settings.brandPrimary ?? "#C4A35A"}
              onChange={(e) => patch("brandPrimary", e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Agenda
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Intervalo de slot (min)">
            <input
              type="number"
              className={inputClass}
              value={settings.slotIntervalMin}
              onChange={(e) =>
                patch("slotIntervalMin", Number(e.target.value))
              }
            />
          </Field>
          <Field label="Antecedência mínima (min)">
            <input
              type="number"
              className={inputClass}
              value={settings.minLeadMin}
              onChange={(e) => patch("minLeadMin", Number(e.target.value))}
            />
          </Field>
          <Field label="Buffer antes (min)">
            <input
              type="number"
              className={inputClass}
              value={settings.bufferBeforeMin}
              onChange={(e) =>
                patch("bufferBeforeMin", Number(e.target.value))
              }
            />
          </Field>
          <Field label="Buffer depois (min)">
            <input
              type="number"
              className={inputClass}
              value={settings.bufferAfterMin}
              onChange={(e) => patch("bufferAfterMin", Number(e.target.value))}
            />
          </Field>
          <Field label="Máx. dias à frente">
            <input
              type="number"
              className={inputClass}
              value={settings.maxAdvanceDays}
              onChange={(e) =>
                patch("maxAdvanceDays", Number(e.target.value))
              }
            />
          </Field>
          <Field label="Cancelamento até (min antes)">
            <input
              type="number"
              className={inputClass}
              value={settings.cancelPolicyMin}
              onChange={(e) =>
                patch("cancelPolicyMin", Number(e.target.value))
              }
            />
          </Field>
        </div>
        <p className="text-xs text-[var(--steel)]">
          Fuso: {settings.timezone}
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Pagamento / depósito
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.depositRequired}
            onChange={(e) => patch("depositRequired", e.target.checked)}
          />
          Exigir depósito no agendamento
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provedor">
            <select
              className={inputClass}
              value={settings.paymentProvider}
              onChange={(e) =>
                patch(
                  "paymentProvider",
                  e.target.value as Settings["paymentProvider"],
                )
              }
            >
              <option value="NONE">Nenhum</option>
              <option value="PIX_MANUAL">PIX manual</option>
              <option value="ASAAS">Asaas</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </Field>
          <Field label="% do depósito">
            <input
              type="number"
              className={inputClass}
              value={settings.depositPercent ?? ""}
              onChange={(e) =>
                patch(
                  "depositPercent",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </Field>
          <Field label="Depósito fixo (R$)">
            <input
              className={inputClass}
              value={depositFixedReais}
              onChange={(e) => setDepositFixedReais(e.target.value)}
              inputMode="decimal"
            />
          </Field>
        </div>
        {settings.hasAsaasKey ? (
          <p className="text-xs text-[var(--steel)]">
            Chave Asaas já configurada (não exibida). Troca só via operação
            manual por enquanto.
          </p>
        ) : (
          <p className="text-xs text-[var(--steel)]">
            Sem chave Asaas neste tenant — configure no banco/env se for usar
            PIX Asaas.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          WhatsApp
        </h2>
        <Field label="Instance ID (uazapi)">
          <input
            className={inputClass}
            value={settings.waInstanceId ?? ""}
            onChange={(e) => patch("waInstanceId", e.target.value || null)}
          />
        </Field>
        <Field label="Provider">
          <input
            className={inputClass}
            value={settings.waProvider ?? ""}
            onChange={(e) => patch("waProvider", e.target.value || null)}
            placeholder="uazapi"
          />
        </Field>
      </section>

      {error ? (
        <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-xl bg-[var(--copper)] px-4 py-3 text-sm font-semibold text-[var(--graphite)] disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
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
