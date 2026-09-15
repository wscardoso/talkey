ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMPTZ(6);
