"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import {
  THEME_PRESETS,
  THEME_RADIUS,
  getThemePreset,
  themePresetVars,
  type ThemePreset,
} from "@/lib/themes/presets";

type ThemeSettings = {
  slug: string;
  name: string;
  brandPrimary: string | null;
  logoUrl: string | null;
  themePreset: string | null;
};

const inputClass =
  "min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--graphite)] px-3 text-sm outline-none ring-[var(--copper)] focus:ring-2";

export function ThemesBoard() {
  const [settings, setSettings] = useState<ThemeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/settings");
    const data = await res.json();
    if (data.settings) {
      setSettings({
        slug: data.settings.slug,
        name: data.settings.name,
        brandPrimary: data.settings.brandPrimary,
        logoUrl: data.settings.logoUrl,
        themePreset: data.settings.themePreset,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next?: Partial<ThemeSettings>) => {
    if (!settings) return;
    const payload = { ...settings, ...next };
    setSettings(payload);
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/app/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandPrimary: payload.brandPrimary || null,
        logoUrl: payload.logoUrl || "",
        themePreset: payload.themePreset || "",
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Não foi possível salvar o tema");
      return;
    }
    setMessage("Tema atualizado");
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError(null);
    setMessage(null);
    const body = new FormData();
    body.set("kind", "logo");
    body.set("file", file);
    const res = await fetch("/api/app/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.message ?? "Falha no upload");
      return;
    }
    if (typeof data.url === "string") {
      await save({ logoUrl: data.url });
    }
  };

  if (loading || !settings) {
    return <p className="text-sm text-[var(--steel)]">Carregando…</p>;
  }

  const current = getThemePreset(settings.themePreset);
  const shellVars = themePresetVars(current, settings.brandPrimary);

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-2xl border border-[var(--border)]"
        style={shellVars as CSSProperties}
      >
        <div
          className="flex items-center gap-4 p-5"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 0%, color-mix(in srgb, var(--brand) 30%, transparent), transparent 70%), var(--bg)",
          }}
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--surface-2)] ring-2 ring-[var(--brand)]/40">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-xl text-[var(--brand)]">
                {settings.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--fg)]">
              {settings.name}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {current.label} · prévia da página pública
            </p>
          </div>
        </div>
        <div
          className="space-y-2 px-5 pb-5"
          style={{ background: "var(--bg)" }}
          aria-hidden
        >
          <div className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-2.5 text-sm">
            <span className="text-[var(--fg)]">Combo completo</span>
            <span className="font-semibold text-[var(--brand)]">R$ 70</span>
          </div>
          <div className="flex gap-2">
            {["09:00", "10:30", "14:00"].map((hour, i) => (
              <span
                key={hour}
                className="flex h-9 flex-1 items-center justify-center rounded-[var(--radius-card)] border text-xs font-semibold tabular-nums"
                style={
                  i === 0
                    ? {
                        background: "var(--brand)",
                        borderColor: "var(--brand)",
                        color: "var(--brand-fg)",
                      }
                    : {
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--fg)",
                      }
                }
              >
                {hour}
              </span>
            ))}
          </div>
          <div
            className="flex min-h-11 items-center justify-center rounded-[var(--radius-card)] text-sm font-semibold"
            style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
          >
            Confirmar horário
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
            Packs de tema
          </h2>
          <p className="mt-1 text-xs text-[var(--steel)]">
            Cada pack muda cor, superfície e cantos da sua página de
            agendamento. Escolher um pack volta a usar a cor dele.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={current.id === preset.id}
              disabled={saving}
              onSelect={() =>
                void save({ themePreset: preset.id, brandPrimary: null })
              }
            />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Ajustes da casa
        </h2>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
            Cor principal
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              aria-label="Escolher cor principal"
              className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--graphite)]"
              value={settings.brandPrimary ?? current.tokens.brand}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, brandPrimary: e.target.value } : s,
                )
              }
            />
            <input
              className={inputClass}
              value={settings.brandPrimary ?? ""}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, brandPrimary: e.target.value || null } : s,
                )
              }
              placeholder={current.tokens.brand}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--steel)]">
            Vazio usa a cor do pack {current.label} ({current.tokens.brand}).
          </p>
        </label>
        {settings.brandPrimary ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save({ brandPrimary: null })}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm text-[var(--steel)] disabled:opacity-50"
          >
            Voltar para a cor do pack
          </button>
        ) : null}
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
            Logo
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm text-[var(--steel)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--copper)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--graphite)]"
            disabled={uploading || saving}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
              e.target.value = "";
            }}
          />
          <p className="mt-1 text-xs text-[var(--steel)]">
            JPEG, PNG ou WebP até 2 MB.
          </p>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
            URL do logo (opcional)
          </span>
          <input
            className={`${inputClass} mt-1`}
            value={settings.logoUrl ?? ""}
            onChange={(e) =>
              setSettings((s) =>
                s ? { ...s, logoUrl: e.target.value || null } : s,
              )
            }
            placeholder="https://…"
            inputMode="url"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="min-h-11 rounded-xl bg-[var(--copper)] px-4 text-sm font-semibold text-[var(--graphite)] disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar tema"}
        </button>
      </section>

      <p className="text-sm text-[var(--steel)]">
        Fotos dos serviços: edite a URL da imagem em{" "}
        <Link href="/app/servicos" className="text-[var(--copper)] underline">
          Serviços
        </Link>
        .
      </p>

      {settings.slug ? (
        <Link
          href={`/agendar/${settings.slug}`}
          target="_blank"
          className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm"
        >
          Ver página pública
        </Link>
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

function PresetCard({
  preset,
  selected,
  disabled,
  onSelect,
}: {
  preset: ThemePreset;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex flex-col gap-3 rounded-2xl border p-3 text-left transition disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--copper)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lead)] ${
        selected
          ? "border-[var(--copper)] bg-[var(--brand-soft)]"
          : "border-[var(--border)] hover:border-[var(--steel)]/60"
      }`}
    >
      <PresetPreview preset={preset} />
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-[var(--offwhite)]">
            {preset.label}
          </span>
          <span className="text-[11px] text-[var(--steel)]">
            {THEME_RADIUS[preset.radius].label}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-[var(--steel)]">
          {preset.description}
        </p>
        <ul className="flex flex-wrap gap-1 pt-0.5">
          {preset.fit.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--steel)]"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function PresetPreview({ preset }: { preset: ThemePreset }) {
  return (
    <div
      aria-hidden
      className="space-y-2 rounded-xl p-3"
      style={
        {
          ...themePresetVars(preset),
          background: "var(--bg)",
        } as CSSProperties
      }
    >
      <div className="flex items-center gap-2">
        <span
          className="h-7 w-7 rounded-full"
          style={{ background: "var(--brand)" }}
        />
        <span className="flex-1 space-y-1">
          <span className="block h-2 w-20 rounded-full bg-[var(--fg)] opacity-80" />
          <span className="block h-1.5 w-12 rounded-full bg-[var(--muted)] opacity-70" />
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2">
        <span className="h-2 w-16 rounded-full bg-[var(--muted)] opacity-70" />
        <span className="text-[10px] font-semibold text-[var(--brand)]">
          R$ 45
        </span>
      </div>
      <div className="flex gap-1.5">
        {["09:00", "09:40", "10:20"].map((t, i) => (
          <span
            key={t}
            className="flex-1 rounded-[var(--radius-card)] border border-[var(--border)] py-1 text-center text-[9px] font-semibold tabular-nums"
            style={
              i === 1
                ? { background: "var(--brand)", color: "var(--brand-fg)" }
                : { background: "var(--surface)", color: "var(--fg)" }
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
