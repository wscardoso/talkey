-- Pack de tema escolhido pelo tenant (Pro) — aplicado na página pública de agendamento
ALTER TABLE "public"."tenants" ADD COLUMN IF NOT EXISTS "theme_preset" TEXT;
