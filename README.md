# Talkey

Multi-tenant booking SaaS for barbershops and salons (WhatsApp, agenda, billing).

> Agendamento com compromisso. A casa cumpre o horário.

- Brand: [`03_BRAND_TALKEY.md`](./03_BRAND_TALKEY.md)
- Deploy: [`DEPLOY.md`](./DEPLOY.md) → `talkey.digitallforcelabs.cloud`
- Roadmap: [`ROADMAP_SAAS.md`](./ROADMAP_SAAS.md) (Fase C concluída)

## Stack

Next.js 15 · Prisma · Postgres (Supabase) · Coolify · uazapi · Asaas

## Local

```bash
npm install
npx prisma migrate deploy
npm run dev
```

| Route | Role |
|-------|------|
| `/` | Landing Talkey |
| `/comecar` | Signup + trial |
| `/app/login` | Owner login |
| `/agendar/{slug}` | Public booking |
| `/app/*` | Owner dashboard |

See `DEPLOY.md` for Traefik host `talkey.digitallforcelabs.cloud`.
