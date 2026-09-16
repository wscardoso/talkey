export const PLANS = {
  trial: {
    id: "trial",
    label: "Trial",
    priceCents: 0,
    description: "30 dias grátis para configurar e atender.",
  },
  starter: {
    id: "starter",
    label: "Starter",
    priceCents: 7900,
    description: "Agenda, equipe, WhatsApp e relatórios básicos.",
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceCents: 12900,
    description: "Tudo do Starter + campanhas, mensalistas e temas.",
  },
  expired: {
    id: "expired",
    label: "Expirado",
    priceCents: 0,
    description: "Assinatura ou trial encerrado.",
  },
} as const;

export type PlanId = keyof typeof PLANS;

/** Features gated behind Pro (trial gets everything during onboarding). */
export type PlanFeature = "campaigns" | "memberships" | "themes";

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  campaigns: "Campanhas",
  memberships: "Mensalistas",
  themes: "Temas",
};

const PRO_FEATURES: readonly PlanFeature[] = [
  "campaigns",
  "memberships",
  "themes",
];

/** Which paid/trial plans unlock each advanced feature. */
export const PLAN_FEATURES: Record<PlanId, readonly PlanFeature[]> = {
  trial: PRO_FEATURES,
  starter: [],
  pro: PRO_FEATURES,
  expired: [],
};

export function planHasFeature(
  plan: string,
  feature: PlanFeature,
): boolean {
  const id = plan in PLANS ? (plan as PlanId) : "expired";
  return PLAN_FEATURES[id].includes(feature);
}

export function formatPlanPrice(cents: number): string {
  if (cents <= 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
