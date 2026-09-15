"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ThemeSettings = {
  slug: string;
  name: string;
  brandPrimary: string | null;
  logoUrl: string | null;
};

const PRESETS = [
  { id: "cobre", label: "Cobre", color: "#E06535" },
  { id: "ouro", label: "Ouro", color: "#C4A35A" },
  { id: "verde", label: "Verde oliva", color: "#6B8F71" },
  { id: "azul", label: "Azul petróleo", color: "#3D6B7A" },
  { id: "vinho", label: "Vinho", color: "#8B3A3A" },
  { id: "carvao", label: "Carvão", color: "#8A8F98" },
] as const;

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
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar o tema");
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

  const brand = settings.brandPrimary ?? "#E06535";

  return (
    <div className="space-y-5">
      <section
        className="overflow-hidden rounded-2xl border border-[var(--border)]"
        style={{
          background: `linear-gradient(160deg, color-mix(in srgb, ${brand} 28%, #1a1b1e), #1a1b1e 70%)`,
        }}
      >
        <div className="flex items-center gap-4 p-5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--graphite)] ring-2 ring-white/20">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center font-[family-name:var(--font-display)] text-xl"
                style={{ color: brand }}
              >
                {settings.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
              {settings.name}
            </p>
            <p className="text-sm text-[var(--steel)]">
              Prévia da página pública
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Presets
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => {
            const active =
              (settings.brandPrimary ?? "").toUpperCase() ===
              p.color.toUpperCase();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => void save({ brandPrimary: p.color })}
                className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left text-sm ${
                  active
                    ? "border-[var(--copper)] bg-[var(--brand-soft)]"
                    : "border-[var(--border)]"
                }`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-lg"
                  style={{ backgroundColor: p.color }}
                />
                {p.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--lead)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--steel)]">
          Personalizar
        </h2>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-[var(--steel)]">
            Cor principal
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--graphite)]"
              value={brand}
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
              placeholder="#E06535"
            />
          </div>
        </label>
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
