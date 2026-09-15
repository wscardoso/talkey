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
ASAAS_WEBHOOK_TOKEN=...
```

Opcional upload: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=tenant-media`

## 3. Webhook Asaas (conta da plataforma)

URL: `https://talkey.digitallforcelabs.cloud/api/webhooks/asaas`  
Token = mesmo valor de `ASAAS_WEBHOOK_TOKEN`  
Eventos: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`

## 4. Cron (opcional)

```
curl -X POST "https://talkey.digitallforcelabs.cloud/api/cron/notifications" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 5. Rename checklist (repo + pasta local)

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
| `/agendar/{slug}` | Booking público |

- [ ] Domain `https://talkey.digitallforcelabs.cloud`
- [ ] SSL ok
- [ ] Webhook Asaas atualizado
