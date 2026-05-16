## Context

O projeto já possui um star schema completo com `cube_gastos_mensais` (gold layer) que agrega gastos por ano, mês, categoria e grupo por tenant. O `supervisor` e o `digest-cron` são pods Bun/TS separados no docker-compose — o `ml-trainer` segue o mesmo padrão de isolamento em pod próprio, mas em Python.

O trainer precisa acessar dados cross-tenant (lê todos os tenants, treina modelos separados). A conexão será feita com usuário superuser do Postgres para contornar o RLS das views (que usam `security_invoker = true`), filtrando manualmente por `tenant_id`.

## Goals / Non-Goals

**Goals:**
- Treinar um modelo preditivo por tenant com histórico mensal de gastos por categoria
- Gerar e salvar previsões para os próximos 3 meses por categoria por tenant
- Rodar diariamente às 00:00 em pod Docker isolado
- Fallback gracioso para tenants com dados insuficientes (< 3 meses)

**Non-Goals:**
- Não expõe API HTTP — apenas escreve no Postgres
- Não persiste arquivos `.pkl` — predições vão direto para tabela
- Não treina modelo global/compartilhado entre tenants
- Não faz fine-tuning ou transfer learning

## Decisions

### D1: RandomForest por tenant (sem modelo global)

**Escolha:** Um modelo treinado por tenant com dados próprios.

**Alternativa:** Modelo global com âncora histórica por tenant (igual ao reference `meu-primeiro-modelo`).

**Rationale:** Isolamento de dados é crítico num sistema multitenant. Tenants com poucos dados recebem `status = 'insufficient_data'` — mais honesto que um modelo global que diluiria os dados.

### D2: Fonte de dados — `cube_gastos_mensais` via query SQL direta

**Escolha:** Query SQL direta na view `cube_gastos_mensais` + join com `tenant_members` para obter o `tenant_id`.

**Alternativa:** Ler `transactions_enriched` direto e agregar em Python/pandas.

**Rationale:** `cube_gastos_mensais` já agrega no nível certo (mês × categoria), evita trazer linhas brutas de transação para o Python. Mais eficiente e consistente com o que a API já exibe.

### D3: Features do modelo

```
Numéricas:
  - mes_do_ano          (1-12, sazonalidade)
  - media_3m_categoria  (âncora histórica — análogo ao preco_mediano_sku)
  - total_meses_hist    (contexto de riqueza do histórico)

Categóricas (OneHot):
  - category_pt         (qual categoria)
  - group_pt            (Necessidades / Desejos / Sem Grupo)

Target:
  - total_gastos        (R$ gasto nessa categoria naquele mês)
```

### D4: Output — tabelas Postgres (não .pkl)

**Escolha:** Predições salvas em `forecast_predictions`; metadados em `forecast_model_meta`.

**Alternativa:** Salvar `.pkl` em volume Docker e expor FastAPI.

**Rationale:** Mais simples, sem networking entre pods Python↔TS. O `api-server` Bun já sabe falar com Postgres. Nenhum novo ponto de falha.

### D5: Conexão superuser para acesso cross-tenant

**Escolha:** `DATABASE_URL` com usuário `postgres` (superuser) no pod `ml-trainer`.

**Alternativa:** Usuário `finance` com RLS, iterando com `SET app.tenant_id = '...'` por sessão.

**Rationale:** O trainer precisa descobrir todos os tenants primeiro — isso exige acesso à tabela `tenants` sem filtro RLS. Usar superuser é mais simples. A variável de ambiente será separada (`ML_DATABASE_URL`) para não misturar com `DATABASE_URL` do `api-server`.

### D6: Scheduler — biblioteca `schedule` em Python

**Escolha:** `schedule` com loop bloqueante, executa às 00:00 BRT.

**Alternativa:** Cron do sistema operacional dentro do container.

**Rationale:** Mesmo padrão do `digest-cron` (que usa `node-cron` em Bun). Simples, sem necessidade de cron daemon no container.

## Risks / Trade-offs

- **Tenant com poucos dados** → Fallback `status = 'insufficient_data'`, UI trata graciosamente
- **cube_gastos_mensais usa security_invoker** → Mitigação: conexão superuser + filtro manual por tenant_id
- **RandomForest pode overfitar em tenants com histórico curto (3-6 meses)** → Mitigação: mínimo de 3 meses enforçado; erro (MAE) salvo em `forecast_model_meta` para transparência
- **Primeiro run do dia pode colidir com insert anterior** → Mitigação: UPSERT em `forecast_predictions` por `(tenant_id, category_pt, target_year, target_month)`

## Migration Plan

1. Adicionar tabelas `forecast_predictions` e `forecast_model_meta` ao schema SQL (novo arquivo `forecast.sql` montado via volume Docker)
2. Build do `Dockerfile.ml-trainer`
3. Adicionar serviço `ml-trainer` ao `docker-compose.yml`
4. Primeiro run manual para validar predições antes do cron automático

## Open Questions

_(nenhuma — decisões tomadas durante exploração)_
