import { describe, expect, it } from "vitest";
import { signupSchema, slugifyTenantName } from "@/lib/validations/signup";

describe("slugifyTenantName", () => {
  it("normalizes accents and spaces", () => {
    expect(slugifyTenantName("Studio Yara")).toBe("studio-yara");
    expect(slugifyTenantName("Taynara Batista — Nails")).toBe(
      "taynara-batista-nails",
    );
  });
});

describe("signupSchema", () => {
  it("accepts valid payload", () => {
    const parsed = signupSchema.safeParse({
      salonName: "Studio Yara",
      slug: "studio-yara",
      ownerName: "Lucas",
      email: "lucas@example.com",
      password: "senha1234",
      phone: "61993439213",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.phone).toBe("+5561993439213");
      expect(parsed.data.email).toBe("lucas@example.com");
    }
  });

  it("rejects taken-style slug format", () => {
    const parsed = signupSchema.safeParse({
      salonName: "X",
      slug: "Bad Slug",
      ownerName: "Lucas",
      email: "lucas@example.com",
      password: "senha1234",
    });
    expect(parsed.success).toBe(false);
  });
});
