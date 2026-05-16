## Why

O digest hoje é gerado on-demand via `GET /api/digest` chamando o script `bun run digest` que chama a AI e retorna o resultado — latência de 5-10s por request. Com multi-tenant e workers de enrich em background, o digest deve ser gerado automaticamente uma vez por dia (quando o enrich do mês estiver completo) e servido como leitura simples do banco. Isso elimina a latência on-demand e evita gerar digest com dados incompletos.

## What Changes

- `GET /api/digest` passa a ser leitura simples de `ai_monthly_digest` — sem chamar AI, resposta em <100ms
- Retorna `{ status: "pending" }` quando enrich do mês não está completo
- Retorna `{ status: "ready", data: { ... } }` quando digest existe
- Processo cron roda diariamente às 23:50, verifica cobertura de enrich por tenant/mês, gera digest via AI para tenants com 100% de cobertura
- O script `src/scripts/digest.ts` é **descontinuado**

## Capabilities

### New Capabilities

- `digest-cron-process`: Processo cron diário que verifica cobertura de enrich e gera digest para tenants prontos
- `digest-gate`: `GET /api/digest` retorna `{ status: "pending" | "ready" }` baseado em leitura do banco

### Modified Capabilities

- `ai-digest-pipeline`: O pipeline de digest deixa de ser CLI e passa a ser executado pelo cron

## Impact

- `src/application/web/routes/digest.ts` — simplificado para leitura de `ai_monthly_digest` com campo `status`
- `src/infrastructure/db/BunPgAdapter.ts` — método `getDigestStatus(tenantId, year, month)` retornando cobertura + digest se existir
- `src/application/cron/digest-cron.ts` — novo arquivo: processo cron
- `src/scripts/digest.ts` — removido
- `package.json` — remove script `digest`, adiciona script `cron`
