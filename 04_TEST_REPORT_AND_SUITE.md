# 04 — Test Report & Suite (Booking Edge-Case Audit)

**Product:** Talkey — multi-tenant Booking SaaS (Barber / Beauty)
**Workspace:** `talkey`
**Stack under test:** Next.js 15 App Router · Prisma/PostgreSQL · Redis locks (ioredis, in-memory fallback) · Zod · Luxon · WhatsApp via `NotificationLog` (no BullMQ) · Asaas PIX billing
**Audit date:** 2026-09-04 (booking) · **Billing update:** 2026-09-15
**Runner:** Vitest 3.2.4 (`npm test`)

---

## 1. Executive Summary

| Area | Verdict | Notes |
|---|---|---|
| Concurrency (same staff + slot) | **PASS** (demo/in-memory locks) | 1 success / 4 conflicts (`SLOT_LOCKED` or `SLOT_UNAVAILABLE`). Production also has GiST exclusion + Redis `SET NX`. |
| Timezone / DST / closing edge | **PASS** | 90‑min service 30‑min before close rejected; multi-TZ labels differ; US Eastern spring/fall handled via Luxon. |
| Validation / XSS / SQLi | **PASS** after fix | Zod UUID/datetime gates injection vectors; HTML/script sanitization added on name/notes. |
| Tenant isolation | **PASS** after fix | Public slug lookup fail-closed; foreign service/staff rejected. **Idempotency key was cross-tenant leaky** — fixed. |
| WhatsApp downtime | **PASS** after fix | Booking succeeds when provider returns 500; delivery status now `retry` (queue signal). No BullMQ in repo. |
| Billing / gating (Fase C) | **PASS** (unit) | Entitlements starter/pro, trial expiry, subscription stacking, `talkey-sub`/`trato-sub` parse, public bookability. |
| Live Postgres HTTP race | **SKIPPED** | Opt-in `RUN_DB_TESTS=1` + running app. |

**Executed (2026-09-15):** 47 passed · 1 skipped · 0 failed.

**Critical finding fixed:** `createBookingAtomic` returned another tenant’s booking when an `Idempotency-Key` collided across tenants (IDOR / data leak).

---

## 2. Discovered Architecture (relevant to tests)

### Public APIs (real)

| Method | Path | Role |
|---|---|---|
| `GET` | `/api/tenants/[slug]` | Public tenant catalog (billing-aware) |
| `GET` | `/api/slots?slug&serviceId&staffId&date` | Slot availability |
| `POST` | `/api/bookings` | Create booking (`Idempotency-Key` header) |

Primary implementation path: `src/app/api/bookings/route.ts` → `createBookingAtomic` in `src/lib/booking-service.ts`.

### Billing (Fase C)

| Piece | Path |
|---|---|
| Access / expiry | `src/lib/billing/access.ts` |
| Plan features | `src/lib/billing/plans.ts` |
| Checkout PIX | `src/lib/billing/asaas-checkout.ts` |
| SaaS payment ledger | `src/lib/billing/subscription-payment.ts` + `subscription_payments` |
| Owner gate | `src/lib/auth/require-owner.ts` (`feature?: campaigns\|memberships\|themes`) |
| Webhook | `src/app/api/webhooks/asaas/route.ts` |
| Cron expiry | `src/app/api/cron/notifications/route.ts` → `expireLapsedTenants` |
| Ops CLI | `scripts/ops-tenant.ts` (`npm run ops:tenant`) |

### Notifications

- Not BullMQ. Persistence queue = `notification_logs` with `status` ∈ `queued | sent | failed | retry`.
- Failures surface in `/app/financeiro` (`notificationFailures`).

### Demo mode

`DEMO_MODE=true` uses `src/lib/demo-store.ts`. Suites default to demo so they run without Postgres/Redis.

---

## 3. Test Files (canonical suite)

| File | Covers |
|---|---|
| `tests/concurrency.booking.test.ts` | 5 concurrent bookers, same staff+slot |
| `tests/timezone.slots.test.ts` | Closing edge, SP timezone, US DST |
| `tests/security.validation.test.ts` | XSS, SQLi strings, tenant isolation |
| `tests/webhook.resilience.test.ts` | WhatsApp 500 / network → booking OK + `retry` |
| `tests/billing.access.test.ts` | evaluateAccess, entitlements, sub refs, stacking, public bookability |
| `tests/signup.validation.test.ts` | Signup validation |
| `tests/owner.validation.test.ts` | Owner Zod schemas |
| `tests/phone.validation.test.ts` | Phone E.164 |
| `tests/whatsapp.reminder.test.ts` | Reminder scheduling |
| `tests/db.concurrency.integration.test.ts` | Live HTTP race (opt-in) |

Config: `vitest.config.ts` · script: `"test": "vitest run"`.

---

## 4. Billing suite highlights (Fase C)

- Trial ativo vs expirado
- Starter com `subscriptionEndsAt` passado → bloqueado
- `planHasFeature`: trial/pro liberam campanhas/mensalistas/temas; starter não
- `buildSubExternalRef` / `parseSubExternalRef` (`talkey-sub:` + legado `trato-sub:`)
- `computeSubscriptionEnd` empilha meses a partir do maior entre agora e o vencimento atual
- `isTenantPubliclyBookable` rejeita trial vencido mesmo com `isActive: true`

---

## 5. How to Run

```bash
npm test
npm run test:watch
npm run build
npm run lint
```

Live DB race (optional):

```bash
# Terminal 1
npm run dev

# Terminal 2
set RUN_DB_TESTS=1
set TEST_BASE_URL=http://127.0.0.1:3000
set TEST_TENANT_SLUG=dom-carlos-barbearia
npm test
```

---

## 6. Execution Results (2026-09-15)

```
✓ tests/whatsapp.reminder.test.ts (3)
✓ tests/concurrency.booking.test.ts (2)
✓ tests/timezone.slots.test.ts (5)
✓ tests/webhook.resilience.test.ts (4)
✓ tests/security.validation.test.ts (8)
✓ tests/owner.validation.test.ts (4)
✓ tests/signup.validation.test.ts (3)
✓ tests/billing.access.test.ts (14)
✓ tests/phone.validation.test.ts (4)
↓ tests/db.concurrency.integration.test.ts (1 skipped)

Test Files  9 passed | 1 skipped
Tests       47 passed | 1 skipped
```

---

## 7. Residual Gaps

1. No automated E2E (Playwright) against `/agendar/[slug]` UI or full Asaas webhook.
2. Invites OWNER/MANAGER deferred (Fase C optional).
3. Stripe SaaS checkout not implemented (Asaas PIX only).
4. Architecture mentions RLS; schema does not enforce it yet.
5. Parallel module `src/lib/booking/create-booking.ts` still exists alongside `booking-service.ts`.
