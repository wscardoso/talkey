type UazapiJson = Record<string, unknown>;

function baseUrl(): string {
  return (process.env.UAZAPI_BASE_URL ?? "").replace(/\/$/, "");
}

function adminToken(): string | null {
  return process.env.UAZAPI_ADMIN_TOKEN || null;
}

export function isUazapiConfigured(): boolean {
  return Boolean(baseUrl() && adminToken());
}

async function uazapiFetch(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    admin?: boolean;
    body?: unknown;
  },
): Promise<{ ok: boolean; status: number; json: UazapiJson; text: string }> {
  const base = baseUrl();
  if (!base) {
    return { ok: false, status: 0, json: {}, text: "UAZAPI_BASE_URL missing" };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.admin) {
    const adm = adminToken();
    if (!adm) {
      return { ok: false, status: 0, json: {}, text: "UAZAPI_ADMIN_TOKEN missing" };
    }
    headers.admintoken = adm;
  } else if (opts.token) {
    headers.token = opts.token;
  }

  try {
    const res = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let json: UazapiJson = {};
    try {
      json = text ? (JSON.parse(text) as UazapiJson) : {};
    } catch {
      json = { raw: text };
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      json: {},
      text: err instanceof Error ? err.message : "network_error",
    };
  }
}

function pickString(obj: UazapiJson, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

export async function uazapiInitInstance(name: string): Promise<{
  ok: boolean;
  token: string | null;
  error?: string;
}> {
  const res = await uazapiFetch("/instance/init", {
    method: "POST",
    admin: true,
    body: { name },
  });
  if (!res.ok) {
    return {
      ok: false,
      token: null,
      error: `HTTP_${res.status}: ${res.text}`.slice(0, 400),
    };
  }
  const nested =
    res.json.instance && typeof res.json.instance === "object"
      ? (res.json.instance as UazapiJson)
      : res.json;
  const token = pickString(nested, ["token", "instanceToken", "apikey"]);
  return { ok: Boolean(token), token, error: token ? undefined : "token_missing" };
}

export async function uazapiConnect(instanceToken: string): Promise<{
  ok: boolean;
  qrcode: string | null;
  paircode: string | null;
  status: string | null;
  error?: string;
}> {
  const res = await uazapiFetch("/instance/connect", {
    method: "POST",
    token: instanceToken,
    body: {},
  });
  if (!res.ok) {
    return {
      ok: false,
      qrcode: null,
      paircode: null,
      status: null,
      error: `HTTP_${res.status}: ${res.text}`.slice(0, 400),
    };
  }
  const nested =
    res.json.instance && typeof res.json.instance === "object"
      ? (res.json.instance as UazapiJson)
      : res.json;
  return {
    ok: true,
    qrcode: pickString(nested, ["qrcode", "qrCode", "base64"]) ?? pickString(res.json, ["qrcode", "qrCode"]),
    paircode: pickString(nested, ["paircode", "pairCode"]) ?? pickString(res.json, ["paircode"]),
    status: pickString(nested, ["status"]) ?? pickString(res.json, ["status"]),
  };
}

export async function uazapiStatus(instanceToken: string): Promise<{
  ok: boolean;
  status: string | null;
  owner: string | null;
  profileName: string | null;
  qrcode: string | null;
  paircode: string | null;
  error?: string;
}> {
  const res = await uazapiFetch("/instance/status", {
    method: "GET",
    token: instanceToken,
  });
  if (!res.ok) {
    return {
      ok: false,
      status: null,
      owner: null,
      profileName: null,
      qrcode: null,
      paircode: null,
      error: `HTTP_${res.status}: ${res.text}`.slice(0, 400),
    };
  }
  const nested =
    res.json.instance && typeof res.json.instance === "object"
      ? (res.json.instance as UazapiJson)
      : res.json;
  return {
    ok: true,
    status: pickString(nested, ["status"]),
    owner: pickString(nested, ["owner"]),
    profileName: pickString(nested, ["profileName", "name"]),
    qrcode: pickString(nested, ["qrcode", "qrCode"]),
    paircode: pickString(nested, ["paircode", "pairCode"]),
  };
}

export async function uazapiDisconnect(instanceToken: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await uazapiFetch("/instance/disconnect", {
    method: "POST",
    token: instanceToken,
    body: {},
  });
  if (!res.ok) {
    return { ok: false, error: `HTTP_${res.status}: ${res.text}`.slice(0, 400) };
  }
  return { ok: true };
}
