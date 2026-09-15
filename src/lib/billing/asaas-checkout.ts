import { PLANS, type PlanId } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

export type CheckoutPlan = "starter" | "pro";

export type SubscriptionCheckoutResult = {
  paymentId: string;
  invoiceUrl: string | null;
  pixQrCode: string;
  pixCopyPaste: string;
  valueCents: number;
  dryRun: boolean;
  externalReference: string;
};

function asaasConfig() {
  const apiKey =
    process.env.ASAAS_API_KEY || process.env.ASAAS_API_TOKEN || null;
  const base = (
    process.env.ASAAS_BASE_URL ?? "https://sandbox.asaas.com/api/v3"
  ).replace(/\/$/, "");
  return { apiKey, base };
}

export function buildSubExternalRef(params: {
  tenantId: string;
  plan: CheckoutPlan;
  months: number;
}): string {
  return `talkey-sub:${params.tenantId}:${params.plan}:${params.months}`;
}

export function parseSubExternalRef(
  ref: string | null | undefined,
): { tenantId: string; plan: CheckoutPlan; months: number } | null {
  if (!ref) return null;
  const legacy = ref.startsWith("trato-sub:");
  const current = ref.startsWith("talkey-sub:");
  if (!legacy && !current) return null;
  const parts = ref.split(":");
  if (parts.length !== 4) return null;
  const [, tenantId, plan, monthsRaw] = parts;
  if (plan !== "starter" && plan !== "pro") return null;
  const months = Number(monthsRaw);
  if (!tenantId || !Number.isFinite(months) || months < 1) return null;
  return { tenantId, plan, months };
}

async function ensureAsaasCustomer(params: {
  tenantId: string;
  name: string;
  email: string;
  phone: string | null;
  existingCustomerId: string | null;
  apiKey: string;
  base: string;
}): Promise<string> {
  if (params.existingCustomerId) return params.existingCustomerId;

  const res = await fetch(`${params.base}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: params.apiKey,
    },
    body: JSON.stringify({
      name: params.name,
      email: params.email,
      mobilePhone: (params.phone ?? "").replace(/\D/g, "").slice(-11) || undefined,
      externalReference: params.tenantId,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ASAAS_CUSTOMER_${res.status}: ${errText.slice(0, 300)}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("ASAAS_CUSTOMER_MISSING_ID");

  await prisma.tenant.update({
    where: { id: params.tenantId },
    data: { asaasCustomerId: json.id },
  });
  return json.id;
}

export async function createSubscriptionPixCheckout(params: {
  tenantId: string;
  tenantName: string;
  email: string;
  phone: string | null;
  asaasCustomerId: string | null;
  plan: CheckoutPlan;
  months: number;
}): Promise<SubscriptionCheckoutResult> {
  const months = Math.max(1, Math.min(params.months, 24));
  const planMeta = PLANS[params.plan as PlanId];
  const valueCents = planMeta.priceCents * months;
  const externalReference = buildSubExternalRef({
    tenantId: params.tenantId,
    plan: params.plan,
    months,
  });
  const { apiKey, base } = asaasConfig();

  if (!apiKey) {
    return {
      paymentId: `dry_sub_${params.tenantId.slice(0, 8)}`,
      invoiceUrl: null,
      pixQrCode: `00020126580014br.gov.bcb.pix0136talkey-sub-demo520400005303986540${(valueCents / 100).toFixed(2)}5802BR5913TALKEY DEMO6009SAO PAULO62070503***6304ABCD`,
      pixCopyPaste: `TALKEY-SUB-DEMO-${params.plan}-${months}m-${valueCents}`,
      valueCents,
      dryRun: true,
      externalReference,
    };
  }

  const customerId = await ensureAsaasCustomer({
    tenantId: params.tenantId,
    name: params.tenantName,
    email: params.email,
    phone: params.phone,
    existingCustomerId: params.asaasCustomerId,
    apiKey,
    base,
  });

  const payRes = await fetch(`${base}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: valueCents / 100,
      description: `Talkey ${planMeta.label} — ${months} mês(es)`,
      externalReference,
    }),
  });
  if (!payRes.ok) {
    const errText = await payRes.text();
    throw new Error(`ASAAS_PAYMENT_${payRes.status}: ${errText.slice(0, 300)}`);
  }
  const payJson = (await payRes.json()) as {
    id?: string;
    invoiceUrl?: string;
  };
  if (!payJson.id) throw new Error("ASAAS_PAYMENT_MISSING_ID");

  let pixCopyPaste = "";
  let encodedImage = "";
  const qrRes = await fetch(`${base}/payments/${payJson.id}/pixQrCode`, {
    headers: { access_token: apiKey },
  });
  if (qrRes.ok) {
    const qrJson = (await qrRes.json()) as {
      payload?: string;
      encodedImage?: string;
    };
    pixCopyPaste = qrJson.payload ?? "";
    encodedImage = qrJson.encodedImage ?? "";
  }

  return {
    paymentId: payJson.id,
    invoiceUrl: payJson.invoiceUrl ?? null,
    pixQrCode: encodedImage
      ? `data:image/png;base64,${encodedImage}`
      : pixCopyPaste,
    pixCopyPaste: pixCopyPaste || payJson.id,
    valueCents,
    dryRun: false,
    externalReference,
  };
}
