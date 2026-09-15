import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type MediaKind = "logo" | "service";

function getConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || "tenant-media";
  if (!url || !key) return null;
  return { url, key, bucket };
}

export function isStorageConfigured(): boolean {
  return getConfig() != null;
}

function client(): SupabaseClient {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  return createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadTenantMedia(params: {
  tenantId: string;
  kind: MediaKind;
  file: File | Blob;
  contentType: string;
}): Promise<{ url: string; path: string }> {
  const cfg = getConfig();
  if (!cfg) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  if (!ALLOWED.has(params.contentType)) {
    throw new Error("INVALID_MIME");
  }

  const ext = EXT[params.contentType] ?? "bin";
  const path = `${params.tenantId}/${params.kind}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const sb = client();
  const { error } = await sb.storage.from(cfg.bucket).upload(path, buffer, {
    contentType: params.contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`STORAGE_UPLOAD: ${error.message}`);
  }

  const { data } = sb.storage.from(cfg.bucket).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
