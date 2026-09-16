# Talkey — Roadmap SaaS (fases A → B → C)

Gerado a partir do inventário real do repo. Não reescreve booking/agenda.

---

## Fase A — Gestão operacional na UI

**Objetivo:** o OWNER configura equipe, serviços, horários e políticas sem tocar no DB.

### User stories
1. Como dono, crio/edito/desativo barbeiros e associo quais serviços cada um faz.
2. Como dono, crio/edito/desativo serviços (nome, duração, preço).
3. Como dono, defino horários semanais e folgas/exceções por barbeiro.
4. Como dono, ajusto nome, marca, políticas de slot/lead e depósito/PIX básico.
5. Como dono, vejo empty states claros quando falta equipe/serviço/horário.

### Escopo IN
- `/app/equipe`, `/app/servicos`, `/app/configuracoes` (+ horários embutidos na equipe)
- APIs `/api/app/staff`, `/api/app/services`, `/api/app/settings` (+ rules/exceptions)
- Zod em `src/lib/validations/owner.ts`
- Nav lateral atualizada

### Escopo OUT
- Signup/onboarding, billing, invites STAFF, Location multi-unidade
- Edição de `asaasApiKeyEnc` em texto puro sem criptografia dedicada (campo opcional mascarado / só set)
- Redesign da landing / Dom Carlos

### Critério de aceite
OWNER logado altera serviços/equipe/horários/config e o `/agendar/{slug}` reflete sem seed/SQL.

### Status
**Entregue.**

---

## Fase B — Provisionamento de tenant

**Objetivo:** outra barbearia entra sem SQL manual e sai com WhatsApp pronto para operar.

### User stories
1. Landing “Começar” → nome, slug, email, senha → Tenant + OWNER + defaults mínimos.
2. Slug único validado (citext), feedback se ocupado.
3. **WhatsApp self-serve:** OWNER conecta número via QR Code / pairing na área `/app/whatsapp`.
4. Pós-signup: sessão + redirect checklist (`/app/whatsapp` ou `/app/servicos`).
5. (B.1) Super-admin lista/cria tenants se self-serve for adiado.

### Escopo IN
- `/comecar` → form onboarding
- `POST /api/auth/signup`
- `isActive: true`, `plan: trial`, `trialEndsAt = now() + 30 dias`
- `/app/whatsapp`: criar/conectar instância uazapi, QR Code, status
- Templates + toggles de notificação

### Escopo OUT
- Pagamento de assinatura, custom domain

### Critério de aceite
Barbearia nova completa signup, conecta WhatsApp via QR, recebe boas-vindas com links, configura via Fase A e publica `/agendar/{slug}`.

### Status
**Entregue** (self-serve + WhatsApp QR). Super-admin B.1 permanece opcional.

---

## Fase C — Hardening SaaS

**Objetivo:** cobrar ou cortar tenant; operação sem Prisma Studio.

### User stories
1. Plano/gating por `Tenant.plan` + `isActive`.
2. Checkout ou registro manual de assinatura (Asaas PIX).
3. Invites OWNER/MANAGER opcional — **adiado** (role existe; sem fluxo de convite nesta fase).
4. Logs/alertas básicos de falha WA/PIX — falhas recentes em `/app/financeiro`.

### Limites enforced
| Plano | Incluso | Bloqueado |
|-------|---------|-----------|
| Trial | Tudo (30 dias) | — |
| Starter | Agenda, equipe, WhatsApp, relatórios, config | Campanhas, mensalistas, temas |
| Pro | Tudo do Starter + campanhas, mensalistas, temas | — |
| Expired | Só `/app/assinatura` | Demais APIs/páginas + booking público |

### Escopo OUT
- Stripe checkout SaaS, app mobile, AI WhatsApp agent, multi-Location UI, invites.

### Critério de aceite
- Tenant inadimplente desativado (`plan=expired`, `isActive=false`) via sync on-access **e** cron.
- Booking público respeita `evaluateAccess` (não só `isActive`).
- Limites starter documentados **e** enforced (API + nav + páginas).
- Checkout PIX Asaas + webhook `talkey-sub:` idempotente (`subscription_payments`).
- Ops: `npm run ops:tenant -- status|activate|renew|deactivate <slug>`.

### Status (2026-09-15)
**Concluída** (PR-C1). Invites e Stripe ficam no backlog.

### Evidências
- `src/lib/billing/*`, `src/lib/auth/require-owner.ts`
- `src/app/api/app/billing`, `webhooks/asaas`, `cron/notifications`
- `scripts/ops-tenant.ts`
- Testes: `tests/billing.access.test.ts`
- Deploy: `DEPLOY.md` § billing/cron/webhook

---

## Fase D — Engajamento e operação avançada

**Objetivo:** aumentar retenção e receita do tenant depois de operar o básico.

### Escopo
- `/app/campanhas` — segmentos, preview, disparo WhatsApp ✅ (gated Pro)
- `/app/relatorios` avançado — incremento de analytics ainda no backlog
- `/app/mensalistas` — pacotes/assinaturas de clientes ✅ (gated Pro)
- `/app/temas` — presets + logo + cor na página pública ✅ (gated Pro)
- Biblioteca de mídias — upload básico ✅; galeria avançada futura

### Estimativa
**M–L** por item restante — analytics avançado e galeria.

---

## Checklist de PRs

1. **PR-A1** — validations + APIs services/staff/settings ✅
2. **PR-A2** — UI serviços + equipe (com rules/exceptions) + nav ✅
3. **PR-A3** — UI configurações + empty states / aceite manual ✅
4. **PR-B1** — signup + `/comecar` + trial 30d + mensagem de boas-vindas ✅
5. **PR-B2** — `/app/whatsapp` com QR Code / pairing e status (uazapi) ✅
6. **PR-B3** — templates de mensagem + toggles de notificações ✅
7. **PR-C1** — billing/gating + expiração de trial + limites starter/pro ✅
8. **PR-D1** — campanhas ou resumos avançados ✅
9. **PR-D2** — mensalistas ✅
10. **PR-D3** — temas + biblioteca de mídias ✅ (URL + upload Storage)
11. **PR-E1** — upload logo/serviço via Supabase Storage ✅
12. **PR-E2** — troca de senha do OWNER logado ✅
13. **PR-E3** — checkout assinatura Asaas PIX + webhook ✅

## Operação contínua (não é SQL de bootstrap)

- Coolify: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + bucket público `tenant-media`
- Webhook Asaas apontando para `/api/webhooks/asaas` (**`ASAAS_WEBHOOK_TOKEN` obrigatório em produção**)
- Cron periódico: `POST /api/cron/notifications` com `CRON_SECRET` (expira depósitos, WA queue **e** tenants vencidos)
- Ativar/cortar tenant: `npm run ops:tenant -- …` ou `BILLING_ACTIVATE_SECRET` em `/app/assinatura`
- Prefixo legado `trato-sub:` ainda aceito no webhook; novos checkouts usam `talkey-sub:`

---

## Backlog — evoluções candidatas (fase a definir)

Itens fora do escopo A→C fechado.

### Conta / equipe
- Invites OWNER/MANAGER (token 7d) — **entregue** (`001-owner-manager-invites`, 2026-09-16)
- Tema da marca no shell do `/app` (hoje só página pública)
- Super-admin cross-tenant

### Relatórios avançados
- Gráficos de pico de horários, top clientes, serviço mais vendido, no-show

### Engajamento
- Programa de fidelidade / gift cards
- Galeria de mídias avançada

### Critério para alocar fase
1. Dependências técnicas
2. Valor para o tenant atual vs. crescimento SaaS
3. Não atrasar billing/gating sem decisão explícita
