import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import { prisma } from "@/lib/prisma";
import {
  isUazapiConfigured,
  uazapiConnect,
  uazapiDisconnect,
  uazapiInitInstance,
  uazapiStatus,
} from "@/lib/uazapi/client";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum(["init", "connect", "disconnect", "refresh"]),
});

async function loadTenant(tenantId: string) {
  return prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      waInstanceId: true,
      waProvider: true,
      whatsappE164: true,
    },
  });
}

export async function GET() {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  const tenant = await loadTenant(auth.session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!tenant.waInstanceId) {
    return NextResponse.json({
      configured: isUazapiConfigured(),
      connected: false,
      hasInstance: false,
      status: "none",
      owner: null,
      profileName: null,
      qrcode: null,
      paircode: null,
      whatsappE164: tenant.whatsappE164,
    });
  }

  const st = await uazapiStatus(tenant.waInstanceId);
  return NextResponse.json({
    configured: isUazapiConfigured(),
    connected: st.status === "connected",
    hasInstance: true,
    status: st.status ?? "unknown",
    owner: st.owner,
    profileName: st.profileName,
    qrcode: st.qrcode,
    paircode: st.paircode,
    whatsappE164: tenant.whatsappE164,
    error: st.error,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  if (!isUazapiConfigured()) {
    return NextResponse.json(
      {
        error: "UAZAPI_NOT_CONFIGURED",
        message: "WhatsApp não está configurado no servidor (UAZAPI_*).",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Ação inválida" },
      { status: 400 },
    );
  }

  const tenant = await loadTenant(auth.session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { action } = parsed.data;

  if (action === "init") {
    if (tenant.waInstanceId) {
      const st = await uazapiStatus(tenant.waInstanceId);
      if (st.ok) {
        return NextResponse.json({
          ok: true,
          hasInstance: true,
          status: st.status,
          qrcode: st.qrcode,
          paircode: st.paircode,
          owner: st.owner,
          profileName: st.profileName,
        });
      }
    }

    const created = await uazapiInitInstance(`talkey-${tenant.slug}`);
    if (!created.ok || !created.token) {
      return NextResponse.json(
        {
          error: "INIT_FAILED",
          message: created.error ?? "Falha ao criar instância",
        },
        { status: 502 },
      );
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        waInstanceId: created.token,
        waProvider: "uazapi",
      },
    });

    const connected = await uazapiConnect(created.token);
    return NextResponse.json({
      ok: true,
      hasInstance: true,
      status: connected.status ?? "connecting",
      qrcode: connected.qrcode,
      paircode: connected.paircode,
      error: connected.error,
    });
  }

  if (!tenant.waInstanceId) {
    return NextResponse.json(
      {
        error: "NO_INSTANCE",
        message: "Crie a instância primeiro (Conectar).",
      },
      { status: 400 },
    );
  }

  if (action === "connect" || action === "refresh") {
    const connected = await uazapiConnect(tenant.waInstanceId);
    const st = await uazapiStatus(tenant.waInstanceId);
    if (st.ok && st.owner) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { whatsappE164: st.owner.replace(/\D/g, "") },
      });
    }
    return NextResponse.json({
      ok: connected.ok || st.ok,
      hasInstance: true,
      status: st.status ?? connected.status ?? "connecting",
      qrcode: connected.qrcode ?? st.qrcode,
      paircode: connected.paircode ?? st.paircode,
      owner: st.owner,
      profileName: st.profileName,
      error: connected.error ?? st.error,
    });
  }

  if (action === "disconnect") {
    const result = await uazapiDisconnect(tenant.waInstanceId);
    return NextResponse.json({
      ok: result.ok,
      status: "disconnected",
      error: result.error,
    });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}
