import { NextResponse } from "next/server";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import { updateSettingsSchema } from "@/lib/validations/owner";

export const runtime = "nodejs";

const SETTINGS_SELECT = {
  id: true,
  slug: true,
  name: true,
  phone: true,
  whatsappE164: true,
  email: true,
  addressLine1: true,
  city: true,
  state: true,
  brandPrimary: true,
  logoUrl: true,
  themePreset: true,
  timezone: true,
  slotIntervalMin: true,
  bufferBeforeMin: true,
  bufferAfterMin: true,
  minLeadMin: true,
  maxAdvanceDays: true,
  cancelPolicyMin: true,
  depositRequired: true,
  depositPercent: true,
  depositFixedCents: true,
  paymentProvider: true,
  waInstanceId: true,
  waProvider: true,
  plan: true,
  isActive: true,
} as const;

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: { ...SETTINGS_SELECT, asaasApiKeyEnc: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { asaasApiKeyEnc, ...safe } = tenant;
  return NextResponse.json({
    settings: {
      ...safe,
      hasAsaasKey: Boolean(asaasApiKeyEnc),
    },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const themeTouched =
    data.brandPrimary !== undefined ||
    data.logoUrl !== undefined ||
    data.themePreset !== undefined;
  if (themeTouched) {
    const themeAuth = await requireOwnerApi({ feature: "themes" });
    if (!themeAuth.ok) return themeAuth.response;
  }

  const blankToNull = (v: string | null | undefined) =>
    !v || v === "" ? null : v;

  await prisma.tenant.update({
    where: { id: auth.session.tenantId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: blankToNull(data.phone) } : {}),
      ...(data.whatsappE164 !== undefined
        ? { whatsappE164: blankToNull(data.whatsappE164) }
        : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.addressLine1 !== undefined
        ? { addressLine1: blankToNull(data.addressLine1) }
        : {}),
      ...(data.city !== undefined ? { city: blankToNull(data.city) } : {}),
      ...(data.state !== undefined ? { state: blankToNull(data.state) } : {}),
      ...(data.brandPrimary !== undefined
        ? { brandPrimary: blankToNull(data.brandPrimary) }
        : {}),
      ...(data.logoUrl !== undefined
        ? { logoUrl: blankToNull(data.logoUrl) }
        : {}),
      ...(data.themePreset !== undefined
        ? { themePreset: blankToNull(data.themePreset) }
        : {}),
      ...(data.slotIntervalMin !== undefined
        ? { slotIntervalMin: data.slotIntervalMin }
        : {}),
      ...(data.bufferBeforeMin !== undefined
        ? { bufferBeforeMin: data.bufferBeforeMin }
        : {}),
      ...(data.bufferAfterMin !== undefined
        ? { bufferAfterMin: data.bufferAfterMin }
        : {}),
      ...(data.minLeadMin !== undefined ? { minLeadMin: data.minLeadMin } : {}),
      ...(data.maxAdvanceDays !== undefined
        ? { maxAdvanceDays: data.maxAdvanceDays }
        : {}),
      ...(data.cancelPolicyMin !== undefined
        ? { cancelPolicyMin: data.cancelPolicyMin }
        : {}),
      ...(data.depositRequired !== undefined
        ? { depositRequired: data.depositRequired }
        : {}),
      ...(data.depositPercent !== undefined
        ? { depositPercent: data.depositPercent }
        : {}),
      ...(data.depositFixedCents !== undefined
        ? { depositFixedCents: data.depositFixedCents }
        : {}),
      ...(data.paymentProvider !== undefined
        ? { paymentProvider: data.paymentProvider }
        : {}),
      ...(data.waInstanceId !== undefined
        ? { waInstanceId: blankToNull(data.waInstanceId) }
        : {}),
      ...(data.waProvider !== undefined
        ? { waProvider: blankToNull(data.waProvider) }
        : {}),
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.tenantId },
    select: SETTINGS_SELECT,
  });

  return NextResponse.json({ settings: tenant });
}
