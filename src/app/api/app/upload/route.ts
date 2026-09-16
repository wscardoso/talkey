import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOwnerApi } from "@/lib/auth/require-owner";
import {
  isStorageConfigured,
  MAX_UPLOAD_BYTES,
  uploadTenantMedia,
  type MediaKind,
} from "@/lib/storage/supabase";

export const runtime = "nodejs";

const kindSchema = z.enum(["logo", "service"]);

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth.ok) return auth.response;

  if (!isStorageConfigured()) {
    return NextResponse.json(
      {
        error: "STORAGE_NOT_CONFIGURED",
        message:
          "Upload indisponível. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const kindParsed = kindSchema.safeParse(form.get("kind"));
  if (!kindParsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "kind inválido (logo|service)" },
      { status: 400 },
    );
  }
  const kind = kindParsed.data as MediaKind;

  if (kind === "logo") {
    const themeAuth = await requireOwnerApi({ feature: "themes" });
    if (!themeAuth.ok) return themeAuth.response;
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Arquivo obrigatório" },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: "FILE_TOO_LARGE",
        message: "Imagem deve ter no máximo 2 MB",
      },
      { status: 400 },
    );
  }

  const contentType = file.type || "application/octet-stream";
  try {
    const { url } = await uploadTenantMedia({
      tenantId: auth.session.tenantId,
      kind,
      file,
      contentType,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UPLOAD_FAILED";
    if (msg === "INVALID_MIME") {
      return NextResponse.json(
        {
          error: "INVALID_MIME",
          message: "Use JPEG, PNG ou WebP",
        },
        { status: 400 },
      );
    }
    console.error("[upload]", msg);
    return NextResponse.json(
      { error: "UPLOAD_FAILED", message: "Falha ao enviar imagem" },
      { status: 502 },
    );
  }
}
