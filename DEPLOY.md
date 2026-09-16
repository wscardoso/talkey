# Deploy Talkey no Coolify (jeito certo)

Base: [Coolify Docs](https://coolify.io/docs)

```
GitHub (talkey)  →  Coolify (Dockerfile build)  →  Traefik SSL
              talkey.digitallforcelabs.cloud
```

## 1. DNS (Hostinger)

- **DNS:** CNAME `talkey` → `digitallforcelabs.cloud` (ou o alvo que o Coolify mostrar)
- Remova ou redirecione o antigo `tratobarber` quando o novo estiver estável

## 2. Coolify → Application

1. Source: repo `talkey` (renomeado de `trato`), branch `main`
2. Build pack: **Dockerfile**
3. Port: `3000`
4. **Domains:** `https://talkey.digitallforcelabs.cloud`
5. Runtime env (mínimo):

```
DATABASE_URL=...
AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=https://talkey.digitallforcelabs.cloud
ASAAS_API_KEY=...
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_WEBHOOK_TOKEN=...   # obrigatório em produção
CRON_SECRET=...
```

Opcional upload: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=tenant-media`  
Opcional ativação manual: `BILLING_ACTIVATE_SECRET=...`

## 3. Webhook Asaas (conta da plataforma)

URL: `https://talkey.digitallforcelabs.cloud/api/webhooks/asaas`  
Token = mesmo valor de `ASAAS_WEBHOOK_TOKEN` (header `asaas-access-token`)  
Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`

Em produção, sem `ASAAS_WEBHOOK_TOKEN` o endpoint responde **503**.  
Assinaturas SaaS usam `externalReference` `talkey-sub:{tenantId}:{plan}:{months}` (legado `trato-sub:` ainda aceito). Pagamentos ficam em `subscription_payments` (idempotência por `provider_ref`).

## 4. Cron (obrigatório em staging/prod)

Agenda diária (ou a cada hora) no Coolify:

```
curl -X POST "https://talkey.digitallforcelabs.cloud/api/cron/notifications" \
  -H "Authorization: Bearer $CRON_SECRET"
```

O job:
1. Expira depósitos PIX stale
2. Expira tenants com trial/assinatura vencidos (`plan=expired`, `isActive=false`)
3. Reprocessa `notification_logs` em `queued|retry`

## 5. Planos e limites

| Plano | Preço | Recursos |
|-------|-------|----------|
| Trial | 30 dias | Tudo |
| Starter | R$ 79/mês | Agenda, equipe, WhatsApp, relatórios, config |
| Pro | R$ 129/mês | + campanhas, mensalistas, temas |

Starter tentando acessar Pro → redirect `/app/assinatura?upgrade=1` ou API `403 PLAN_UPGRADE_REQUIRED`.

## 6. Runbook billing (sem Prisma Studio)

Dentro do container / máquina com `DATABASE_URL`:

```bash
# Situação
npm run ops:tenant -- status meu-salao

# Ativar ou renovar (empilha meses a partir do vencimento atual)
npm run ops:tenant -- activate meu-salao pro 1
npm run ops:tenant -- renew meu-salao starter 3

# Cortar acesso
npm run ops:tenant -- deactivate meu-salao
```

Alternativa UI: OWNER em `/app/assinatura` com PIX Asaas, ou `action=activate` + `BILLING_ACTIVATE_SECRET`.

## 7. Rename checklist (repo + pasta local)

1. GitHub → Settings → Rename repository: `trato` → `talkey`
2. Local: `git remote set-url origin https://github.com/wscardoso/talkey.git`
3. Fechar IDE; renomear pasta `Workspace\trato` → `Workspace\talkey`
4. Reabrir projeto; Coolify: confirmar source do repo `talkey`
5. Hostinger CNAME + Coolify domain + `NEXT_PUBLIC_APP_URL` + webhook Asaas

Cookie de sessão passou a `talkey_session` — todos os donos precisam logar de novo.

## Smoke

| Path | Expect |
|------|--------|
| `/` | Landing Talkey |
| `/app/login` | Login |
| `/comecar` | Signup trial |
| `/agendar/{slug}` | Booking público (404 se tenant expired) |
| `/app/assinatura` | Billing / PIX |
| `/app/financeiro` | PIX + falhas WhatsApp recentes |

- [ ] Domain `https://talkey.digitallforcelabs.cloud`
- [ ] SSL ok
- [ ] Webhook Asaas atualizado + token
- [ ] Cron com `CRON_SECRET`
- [ ] Trial expirado → redirect assinatura + booking público 404
- [ ] Starter bloqueado em campanhas/mensalistas/temas
