export const THEME_PRESET_IDS = [
  "navalha",
  "neon-noite",
  "studio",
  "spa",
  "marmore",
  "acolhedor",
  "classica",
] as const;

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];

export type ThemeRadiusId = "reto" | "suave" | "macio";

export type ThemeTokens = {
  brand: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  fg: string;
  muted: string;
};

export type ThemePreset = {
  id: ThemePresetId;
  label: string;
  description: string;
  /** Segmentos em que o pack cai bem — usado nos chips da tela de Temas. */
  fit: string[];
  radius: ThemeRadiusId;
  tokens: ThemeTokens;
};

export const THEME_RADIUS: Record<
  ThemeRadiusId,
  { label: string; card: string }
> = {
  reto: { label: "Cantos retos", card: "0.25rem" },
  suave: { label: "Cantos suaves", card: "0.75rem" },
  macio: { label: "Cantos macios", card: "1.25rem" },
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "navalha",
    label: "Navalha",
    description: "Graphite fechado com cobre quente, do jeito que a casa já é.",
    fit: ["Barbearia", "Estúdio masculino"],
    radius: "suave",
    tokens: {
      brand: "#E06535",
      bg: "#121417",
      surface: "#1E2228",
      surfaceAlt: "#262B33",
      fg: "#F4F5F6",
      muted: "#8C95A1",
    },
  },
  {
    id: "neon-noite",
    label: "Neon noite",
    description: "Preto quase absoluto e magenta elétrico para atender tarde.",
    fit: ["Barbearia urbana", "Salão"],
    radius: "reto",
    tokens: {
      brand: "#FF2E88",
      bg: "#08090B",
      surface: "#14161A",
      surfaceAlt: "#1E2128",
      fg: "#F7F7FA",
      muted: "#99A0AC",
    },
  },
  {
    id: "studio",
    label: "Studio",
    description: "Claro e silencioso, com verde profundo. O serviço na frente.",
    fit: ["Salão", "Clínica"],
    radius: "suave",
    tokens: {
      brand: "#1F6F6B",
      bg: "#FBFAF8",
      surface: "#FFFFFF",
      surfaceAlt: "#EFEEE9",
      fg: "#191C1E",
      muted: "#6A7278",
    },
  },
  {
    id: "spa",
    label: "Spa",
    description: "Sálvia e névoa: ritmo lento, sem pressa na leitura.",
    fit: ["Clínica estética", "Spa"],
    radius: "macio",
    tokens: {
      brand: "#7A9E85",
      bg: "#F4F6F2",
      surface: "#FFFFFF",
      surfaceAlt: "#E7EDE6",
      fg: "#1F2B25",
      muted: "#6B7A71",
    },
  },
  {
    id: "marmore",
    label: "Mármore",
    description: "Cinza frio, ouro velho e cantos retos. Premium sem barulho.",
    fit: ["Clínica", "Salão premium"],
    radius: "reto",
    tokens: {
      brand: "#8F6E2E",
      bg: "#F3F4F6",
      surface: "#FFFFFF",
      surfaceAlt: "#E6E8EC",
      fg: "#14171C",
      muted: "#666E7A",
    },
  },
  {
    id: "acolhedor",
    label: "Acolhedor",
    description: "Papel quente e turquesa amigável, para quem chega com a família.",
    fit: ["Petshop", "Salão de bairro"],
    radius: "macio",
    tokens: {
      brand: "#1E9C8E",
      bg: "#FFF7F0",
      surface: "#FFFFFF",
      surfaceAlt: "#FBE9DA",
      fg: "#2F231B",
      muted: "#7B6858",
    },
  },
  {
    id: "classica",
    label: "Clássica",
    description: "Papel e tinta, com vermelho de barbearia antiga.",
    fit: ["Barbearia clássica", "Salão"],
    radius: "reto",
    tokens: {
      brand: "#8A2E2A",
      bg: "#EFEAE0",
      surface: "#FAF7F1",
      surfaceAlt: "#E3DDD0",
      fg: "#1B1A17",
      muted: "#6E675C",
    },
  },
];

export const DEFAULT_THEME_PRESET_ID: ThemePresetId = "navalha";

export function isThemePresetId(value: unknown): value is ThemePresetId {
  return (
    typeof value === "string" &&
    THEME_PRESET_IDS.includes(value as ThemePresetId)
  );
}

export function getThemePreset(id?: string | null): ThemePreset {
  const found = THEME_PRESETS.find((preset) => preset.id === id);
  return (
    found ??
    THEME_PRESETS.find((preset) => preset.id === DEFAULT_THEME_PRESET_ID) ??
    THEME_PRESETS[0]
  );
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function channel(value: number) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number | null {
  if (!HEX.test(hex)) return null;
  const raw = hex.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Texto legível sobre a cor principal, seja ela clara ou escura. */
export function inkOn(hex: string): string {
  const l = luminance(hex);
  if (l == null) return "#F4F5F6";
  return l > 0.19 ? "#101215" : "#FFFFFF";
}

export function themePresetVars(
  preset: ThemePreset,
  brandOverride?: string | null,
): Record<string, string> {
  const brand =
    brandOverride && HEX.test(brandOverride)
      ? brandOverride
      : preset.tokens.brand;

  return {
    "--bg": preset.tokens.bg,
    "--surface": preset.tokens.surface,
    "--surface-2": preset.tokens.surfaceAlt,
    "--fg": preset.tokens.fg,
    "--muted": preset.tokens.muted,
    "--border": `color-mix(in srgb, ${preset.tokens.muted} 34%, transparent)`,
    "--brand": brand,
    "--brand-soft": `color-mix(in srgb, ${brand} 16%, transparent)`,
    "--brand-fg": inkOn(brand),
    "--radius-card": THEME_RADIUS[preset.radius].card,
  };
}
