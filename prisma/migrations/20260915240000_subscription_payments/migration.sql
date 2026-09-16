-- SaaS subscription payment ledger (Asaas PIX assinatura)
CREATE TABLE IF NOT EXISTS "subscription_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ASAAS',
    "provider_ref" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "external_ref" TEXT,
    "raw_payload" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_payments_provider_ref_key"
  ON "subscription_payments"("provider_ref");

CREATE INDEX IF NOT EXISTS "subscription_payments_tenant_id_created_at_idx"
  ON "subscription_payments"("tenant_id", "created_at");

ALTER TABLE "subscription_payments"
  ADD CONSTRAINT "subscription_payments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
