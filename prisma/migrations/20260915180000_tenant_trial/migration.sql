-- AlterTable
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "trial_started_at" TIMESTAMPTZ(6);
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ(6);
