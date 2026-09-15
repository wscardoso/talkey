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
    description: "Tudo do Starter + campanhas e recursos avançados.",
  },
  expired: {
    id: "expired",
    label: "Expirado",
    priceCents: 0,
    description: "Assinatura ou trial encerrado.",
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function formatPlanPrice(cents: number): string {
  if (cents <= 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
