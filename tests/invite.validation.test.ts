import { describe, expect, it } from "vitest";
import {
  createInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  isInviteRole,
  INVITE_TTL_DAYS,
} from "@/lib/auth/invite-token";
import {
  acceptInviteSchema,
  createInviteSchema,
} from "@/lib/validations/invite";

describe("invite token", () => {
  it("hashes deterministically and differs by token", () => {
    const a = createInviteToken();
    const b = createInviteToken();
    expect(a).not.toBe(b);
    expect(hashInviteToken(a)).toBe(hashInviteToken(a));
    expect(hashInviteToken(a)).not.toBe(hashInviteToken(b));
  });

  it("expires in 7 days", () => {
    const from = new Date("2026-09-16T12:00:00.000Z");
    const exp = inviteExpiresAt(from);
    expect(exp.getTime() - from.getTime()).toBe(
      INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it("allows only OWNER and MANAGER invite roles", () => {
    expect(isInviteRole("OWNER")).toBe(true);
    expect(isInviteRole("MANAGER")).toBe(true);
    expect(isInviteRole("STAFF")).toBe(false);
    expect(isInviteRole("RECEPTION")).toBe(false);
  });
});

describe("invite validation", () => {
  it("accepts OWNER/MANAGER create payload", () => {
    const ok = createInviteSchema.safeParse({
      email: "Gerente@Exemplo.com",
      role: "MANAGER",
      name: "Ana",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.email).toBe("gerente@exemplo.com");
      expect(ok.data.role).toBe("MANAGER");
    }
  });

  it("rejects STAFF role on create", () => {
    const bad = createInviteSchema.safeParse({
      email: "x@y.com",
      role: "STAFF",
    });
    expect(bad.success).toBe(false);
  });

  it("requires password length on accept", () => {
    const bad = acceptInviteSchema.safeParse({ name: "Ana", password: "short" });
    expect(bad.success).toBe(false);
    const ok = acceptInviteSchema.safeParse({
      name: "Ana Silva",
      password: "senha-segura",
    });
    expect(ok.success).toBe(true);
  });
});
