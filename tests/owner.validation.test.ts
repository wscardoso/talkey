import { describe, expect, it } from "vitest";
import {
  createServiceSchema,
  createStaffSchema,
  replaceRulesSchema,
  updateSettingsSchema,
} from "@/lib/validations/owner";

describe("owner validations", () => {
  it("accepts a valid service payload", () => {
    const parsed = createServiceSchema.safeParse({
      name: "Corte Social",
      durationMin: 40,
      priceCents: 3500,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects XSS-heavy staff names after sanitize empties them", () => {
    const parsed = createStaffSchema.safeParse({
      displayName: "<script>x</script>",
      serviceIds: [],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects rule with start >= end", () => {
    const parsed = replaceRulesSchema.safeParse({
      rules: [
        {
          dayOfWeek: "MON",
          startTime: "18:00",
          endTime: "09:00",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts partial settings update", () => {
    const parsed = updateSettingsSchema.safeParse({
      name: "Nova Barbearia",
      slotIntervalMin: 15,
      depositRequired: false,
    });
    expect(parsed.success).toBe(true);
  });
});
