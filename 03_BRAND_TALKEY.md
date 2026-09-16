# 03 — Brand: Talkey

**Product name:** Talkey  
**Positioning:** Agendamento online com WhatsApp e compromisso de horário para negócios de atendimento presencial.

**Segmentos atendidos:** barbearia, salão, clínica estética, petshop.

## Tagline
> Agendamento com compromisso. A casa cumpre o horário.

## Domínios

| Uso | Host | Nota |
|-----|------|------|
| **Staging / MVP** | `talkey.digitallforcelabs.cloud` | Host sob Digitall Force Labs |
| Marca (futuro) | `talkey.app` / domínio próprio | Face comercial |
| Social | `@talkey` | Handle alvo |

**Decisão atual:** `talkey.digitallforcelabs.cloud` como URL oficial enquanto a lab hospeda.

## Visual
- Wordmark: `TALKEY` em display (tracking amplo)
- Mark: balão de fala com chave — `src/components/brand/talkey-mark.tsx`. O balão é a confirmação que sai no WhatsApp; a chave é o horário cumprido. Traço em `currentColor`, viewBox 40, sem lettermark.
- Paleta do produto: cobre `#E06535`, graphite, steel (mantida do design Urbano & Funcional)
- Paleta do tenant: definida pelos packs de tema (`src/lib/themes/presets.ts`), aplicados na página pública

## Copy operacional
- Vocabulário neutro de vertical: **equipe** (não “barbeiros”), **negócio**/**casa**, **quem atende**
- CTA: *Agendar* / *Confirmar horário*
- Sucesso: *Confirmado*
- Footer booking: *Agendado com Talkey* / wordmark TALKEY
- Meta title default: `Talkey — agendamento com compromisso`
