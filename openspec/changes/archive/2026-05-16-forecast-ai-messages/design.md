## Context

O `digest-cron` já estabelece o padrão: cron Bun/TS → lê dados → chama LLM → salva em tabela Postgres. O `forecast-cron` segue exatamente o mesmo padrão, com dados de entrada diferentes (predições ML + gastos do mês atual em vez de insights de enriquecimento).

O LLM recebe um contexto estruturado com: gastos reais do mês atual por categoria, predições para os próximos 3 meses, e comparação com limites 50/30/20 (já presentes no gold layer via `orcamento-views`). A mensagem deve ser curta, pessoal e acionável — como um consultor financeiro brevíssimo.

## Goals / Non-Goals

**Goals:**
- Gerar uma mensagem diária por tenant combinando dados reais + predições
- Seguir o padrão arquitetural do `digest-cron` (cron separado, mesmo BunPgAdapter)
- Salvar mensagem em tabela Postgres para consumo do `api-server`
- Skip gracioso quando não há predições disponíveis para o tenant

**Non-Goals:**
- Não envia push notifications ou e-mails
- Não gera múltiplas mensagens por dia (uma por tenant por dia)
- Não reprocessa mensagens antigas

## Decisions

### D1: Cron Bun/TS separado (não Python)

**Escolha:** Pod `forecast-cron` em Bun/TS, separado do `ml-trainer` Python.

**Rationale:** A chamada ao LLM e o padrão de persistência são idênticos ao `digest-cron` — reaproveita `BunPgAdapter`, `generateDigest` como referência, e o mesmo `AI_BASE_URL`/`AI_MODEL`. Não faz sentido adicionar dependência Python para isso.

### D2: Timing — roda após o trainer ML (não simultâneo)

**Escolha:** `forecast-cron` roda às 00:30 BRT (30 min após o trainer que roda às 00:00).

**Rationale:** O trainer Python precisa terminar antes do cron de mensagens ler as predições. 30 minutos é margem suficiente para tenants típicos. Se predições não existirem, o tenant é simplesmente pulado.

### D3: Contexto LLM — predições + gastos reais do mês atual

**Escolha:** Prompt inclui: (a) gastos reais do mês atual por grupo, (b) predições para os 3 próximos meses por grupo, (c) status 50/30/20 do mês atual.

**Alternativa:** Incluir predições por categoria (mais detalhe).

**Rationale:** Nível de grupo (Necessidades/Desejos/Poupança) é mais legível e acionável. Detalhes por categoria ficam disponíveis na UI.

### D4: Tabela `forecast_ai_messages` — uma linha por tenant por dia

**Escolha:** PK em `(tenant_id, message_date)` com UPSERT.

**Rationale:** Mesmo padrão do `ai_monthly_digest` com PK em `(tenant_id, year, month)`. Idempotente — re-rodar no mesmo dia sobrescreve.

## Risks / Trade-offs

- **Trainer Python ainda não terminou quando cron roda** → Mitigação: 30 min de buffer + skip se sem predições
- **LLM gera mensagem muito longa/vaga** → Mitigação: prompt com instrução explícita de máximo 2 frases, tom direto
- **Tenant sem predições** → Mitigação: skip com log, a UI trata `null` graciosamente

## Migration Plan

1. Adicionar tabela `forecast_ai_messages` ao `forecast.sql`
2. Criar `forecastAgent.ts` e `forecast-cron.ts`
3. Adicionar serviço `forecast-cron` ao `docker-compose.yml`
4. Testar com run manual antes do cron automático

## Open Questions

_(nenhuma)_
