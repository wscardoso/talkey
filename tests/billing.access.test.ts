import { describe, expect, it } from "vitest";
import { evaluateAccess } from "@/lib/billing/access";

describe("evaluateAccess", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");

  it("allows active trial with days left", () => {
    const access = evaluateAccess(
      {
        id: "t1",
        plan: "trial",
        isActive: true,
        trialEndsAt: new Date("2026-09-20T12:00:00.000Z"),
        subscriptionEndsAt: null,
      },
      now,
    );
    expect(access.allowed).toBe(true);
    expect(access.daysLeft).toBe(5);
  });

  it("blocks expired trial", () => {
    const access = evaluateAccess(
      {
        id: "t1",
        plan: "trial",
        isActive: true,
        trialEndsAt: new Date("2026-09-01T12:00:00.000Z"),
        subscriptionEndsAt: null,
      },
      now,
    );
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("trial_expired");
  });

  it("allows starter without subscription end", () => {
    const access = evaluateAccess(
      {
        id: "t1",
        plan: "starter",
        isActive: true,
        trialEndsAt: null,
        subscriptionEndsAt: null,
      },
      now,
    );
    expect(access.allowed).toBe(true);
  });
});
