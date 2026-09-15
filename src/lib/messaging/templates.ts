import { prisma } from "@/lib/prisma";

export const TEMPLATE_KEYS = [
  "booking_created",
  "reminder_24h",
  "reminder_2h",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const PREFERENCE_EVENTS = [
  "booking_created",
  "reminder_24h",
  "reminder_2h",
  "feedback_post",
] as const;

export type PreferenceEvent = (typeof PREFERENCE_EVENTS)[number];

export const DEFAULT_TEMPLATES: Record<
  TemplateKey,
  { label: string; body: string }
> = {
  booking_created: {
    label: "Confirmação",
    body: [
      "Olá {cliente}! ✅ Seu horário na *{barbearia}* está reservado.",
      "",
      "📋 Serviço: {servico}",
      "💈 Profissional: {profissional}",
      "🗓️ Quando: {quando}",
      "📍 {endereco}",
      "",
      "Um dia antes do horário pedimos confirmação de presença.",
      "Se precisar desmarcar agora, use o botão abaixo para liberar a vaga.",
    ].join("\n"),
  },
  reminder_24h: {
    label: "Lembrete (24h)",
    body: [
      "Oi {cliente}! Lembrete do seu horário na *{barbearia}* amanhã.",
      "",
      "📋 Serviço: {servico}",
      "💈 Profissional: {profissional}",
      "🗓️ Quando: {quando}",
      "📍 {endereco}",
      "",
      "Confirme sua presença ou cancele para liberar a vaga.",
    ].join("\n"),
  },
  reminder_2h: {
    label: "Lembrete (2h)",
    body: [
      "Oi {cliente}! Em cerca de 2 horas é o seu horário na *{barbearia}*.",
      "",
      "📋 {servico} com {profissional}",
      "🗓️ {quando}",
      "📍 {endereco}",
      "",
      "Te esperamos!",
    ].join("\n"),
  },
};

export const DEFAULT_PREFERENCES: Record<PreferenceEvent, boolean> = {
  booking_created: true,
  reminder_24h: true,
  reminder_2h: true,
  feedback_post: true,
};

export type TemplateVars = {
  cliente: string;
  servico: string;
  profissional: string;
  barbearia: string;
  endereco: string;
  quando: string;
};

export function renderTemplate(
  body: string,
  vars: TemplateVars,
): string {
  return body
    .replaceAll("{cliente}", vars.cliente)
    .replaceAll("{servico}", vars.servico)
    .replaceAll("{profissional}", vars.profissional)
    .replaceAll("{barbearia}", vars.barbearia)
    .replaceAll("{endereco}", vars.endereco || "—")
    .replaceAll("{quando}", vars.quando)
    .replaceAll("{data}", vars.quando)
    .replaceAll("{hora}", vars.quando);
}

export async function ensureTenantMessagingDefaults(
  tenantId: string,
): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    ...TEMPLATE_KEYS.map((key) =>
      prisma.messageTemplate.upsert({
        where: { tenantId_key: { tenantId, key } },
        update: {},
        create: {
          tenantId,
          key,
          label: DEFAULT_TEMPLATES[key].label,
          body: DEFAULT_TEMPLATES[key].body,
          isActive: true,
          updatedAt: now,
        },
      }),
    ),
    ...PREFERENCE_EVENTS.map((event) =>
      prisma.notificationPreference.upsert({
        where: { tenantId_event: { tenantId, event } },
        update: {},
        create: {
          tenantId,
          event,
          enabled: DEFAULT_PREFERENCES[event],
          updatedAt: now,
        },
      }),
    ),
  ]);
}

export async function isNotificationEnabled(
  tenantId: string,
  event: PreferenceEvent,
): Promise<boolean> {
  const row = await prisma.notificationPreference.findUnique({
    where: { tenantId_event: { tenantId, event } },
    select: { enabled: true },
  });
  if (!row) return DEFAULT_PREFERENCES[event];
  return row.enabled;
}

export async function getTemplateBody(
  tenantId: string,
  key: TemplateKey,
): Promise<string> {
  const row = await prisma.messageTemplate.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { body: true, isActive: true },
  });
  if (row?.isActive && row.body.trim()) return row.body;
  return DEFAULT_TEMPLATES[key].body;
}
