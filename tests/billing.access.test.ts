import { describe, expect, it } from "vitest";
import {
  computeSubscriptionEnd,
  evaluateAccess,
} from "@/lib/billing/access";
import {
  planHasFeature,
  PLAN_FEATURES,
} from "@/lib/billing/plans";
import {
  buildSubExternalRef,
  parseSubExternalRef,
} from "@/lib/billing/asaas-checkout";
import { isTenantPubliclyBookable } from "@/lib/billing/subscription-payment";

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

  it("allows starter without subscription end (legacy)", () => {
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

  it("blocks starter with past subscriptionEndsAt", () => {
    const access = evaluateAccess(
      {
        id: "t1",
        plan: "starter",
        isActive: true,
        trialEndsAt: null,
        subscriptionEndsAt: new Date("2026-09-01T12:00:00.000Z"),
      },
      now,
    );
    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("subscription_expired");
  });
});

describe("plan entitlements", () => {
  it("trial and pro unlock advanced features", () => {
    expect(planHasFeature("trial", "campaigns")).toBe(true);
    expect(planHasFeature("pro", "memberships")).toBe(true);
    expect(planHasFeature("pro", "themes")).toBe(true);
    expect(PLAN_FEATURES.pro).toEqual(["campaigns", "memberships", "themes"]);
  });

  it("starter does not unlock advanced features", () => {
    expect(planHasFeature("starter", "campaigns")).toBe(false);
    expect(planHasFeature("starter", "memberships")).toBe(false);
    expect(planHasFeature("starter", "themes")).toBe(false);
    expect(planHasFeature("expired", "campaigns")).toBe(false);
  });
});

describe("subscription external refs", () => {
  it("builds and parses talkey-sub refs", () => {
    const ref = buildSubExternalRef({
      tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      plan: "pro",
      months: 3,
    });
    expect(ref).toBe(
      "talkey-sub:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:pro:3",
    );
    expect(parseSubExternalRef(ref)).toEqual({
      tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      plan: "pro",
      months: 3,
    });
  });

  it("parses legacy trato-sub refs", () => {
    expect(
      parseSubExternalRef(
        "trato-sub:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:starter:1",
      ),
    ).toEqual({
      tenantId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      plan: "starter",
      months: 1,
    });
  });

  it("rejects invalid refs", () => {
    expect(parseSubExternalRef("booking-uuid")).toBeNull();
    expect(parseSubExternalRef("talkey-sub:x:gold:1")).toBeNull();
  });
});

describe("computeSubscriptionEnd", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");

  it("extends from now when no current end", () => {
    const ends = computeSubscriptionEnd(1, null, now);
    expect(ends.getTime()).toBe(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
  });

  it("stacks months onto future subscription end", () => {
    const current = new Date("2026-10-15T12:00:00.000Z");
    const ends = computeSubscriptionEnd(1, current, now);
    expect(ends.getTime()).toBe(
      current.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
  });

  it("uses now when current end is already past", () => {
    const past = new Date("2026-08-01T12:00:00.000Z");
    const ends = computeSubscriptionEnd(2, past, now);
    expect(ends.getTime()).toBe(
      now.getTime() + 60 * 24 * 60 * 60 * 1000,
    );
  });
});

describe("isTenantPubliclyBookable", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");

  it("rejects expired trial even if still marked active", () => {
    expect(
      isTenantPubliclyBookable(
        {
          id: "t1",
          plan: "trial",
          isActive: true,
          trialEndsAt: new Date("2026-09-01T00:00:00.000Z"),
          subscriptionEndsAt: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("allows active pro with future end", () => {
    expect(
      isTenantPubliclyBookable(
        {
          id: "t1",
          plan: "pro",
          isActive: true,
          trialEndsAt: null,
          subscriptionEndsAt: new Date("2026-12-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe(true);
  });
});
