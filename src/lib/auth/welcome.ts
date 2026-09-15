import { sendWhatsAppText } from "@/lib/whatsapp";

type WelcomeParams = {
  ownerName: string;
  salonName: string;
  slug: string;
  phoneE164: string | null;
  trialDays: number;
};

export function buildWelcomeMessage(params: WelcomeParams): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const bookUrl = `${base}/agendar/${params.slug}`;
  const loginUrl = `${base}/app/login`;

  return [
    `Bem-vindo ao Trato, ${params.ownerName}!`,
    "",
    `Seu negócio *${params.salonName}* já está ativo.`,
    `Você ganhou ${params.trialDays} dias grátis para usar o sistema.`,
    "",
    `Link de agendamento para seus clientes:`,
    bookUrl,
    "",
    `Acesse seu painel:`,
    loginUrl,
    "",
    `Próximo passo: conecte o WhatsApp em /app/whatsapp para enviar confirmações e lembretes.`,
    "",
    `Equipe Trato`,
  ].join("\n");
}

/** Best-effort welcome via platform uazapi token (tenant may not have WA yet). */
export async function sendSignupWelcome(
  params: WelcomeParams,
): Promise<{ sent: boolean; error?: string }> {
  if (!params.phoneE164) {
    return { sent: false, error: "no_phone" };
  }
  const text = buildWelcomeMessage(params);
  const result = await sendWhatsAppText(params.phoneE164, text);
  if (result.status === "sent" || result.status === "queued") {
    return { sent: result.status === "sent" };
  }
  return { sent: false, error: result.error };
}
