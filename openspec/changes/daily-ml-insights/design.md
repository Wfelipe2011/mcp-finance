## Context

O pipeline ML atual (`src/ml/trainer.py` + `forecast-worker.ts`) produz previsões mensais agregadas por categoria usando um RandomForestRegressor treinado sobre `cube_gastos_mensais`. As previsões são armazenadas em `forecast_predictions` e transformadas em mensagens LLM mensais em `forecast_ai_messages`. Não existe nenhuma camada de inteligência diária — o usuário não recebe alertas comportamentais baseados em padrões históricos de dias específicos.

Constraints existentes:
- Bun runtime (não Node.js puro); workers rodam como processos independentes via docker-compose
- Postgres com RLS obrigatória em todas as tabelas scoped por tenant
- Python trainer usa psycopg2 direto via `ML_DATABASE_URL`; sem ORM
- LLM configurado via `AI_MODEL` env var; já usado por `forecast-worker.ts` e `enrich-worker.ts`
- Frontend Vite+React com shim MUI customizado; tab bar tem 5 abas existentes

## Goals / Non-Goals

**Goals:**
- Gerar previsões diárias de gasto por categoria (próximos 30 dias) via extensão do trainer Python existente
- Produzir um hero card de insight personalizado diário via worker LLM dedicado
- Permitir o usuário avaliar desvios de previsão (👍/👎) e acionar re-treino personalizado
- Manter o pipeline mensal existente 100% inalterado
- Zero dependências externas novas

**Non-Goals:**
- Reescrever o trainer mensal ou migrar para Prophet/LSTM
- Push notifications ou alertas em tempo real (fora do ciclo diário do cron)
- Análise de despesas em tempo real (streaming)
- Internacionalização — apenas pt-BR

## Decisions

### D1: VIEW SQL para `daily_habit_signals` (não tabela materializada)

**Escolha**: `CREATE OR REPLACE VIEW` simples.

**Alternativas consideradas**:
- MATERIALIZED VIEW com `pg_cron` para refresh diário: adiciona dependência de pg_cron e complexidade de sincronização
- Tabela Python (ETL no trainer): duplica dados, introduz drift entre trainer e worker

**Rationale**: Volume de transações (~2K por tenant) não justifica materialização. A VIEW retorna dados sempre frescos e é consultada apenas uma vez por dia pelo worker. Custo de query aceitável.

---

### D2: Worker dedicado `daily-insight-worker.ts`

**Escolha**: Novo processo Docker separado, espelho de `forecast-worker.ts`.

**Alternativas consideradas**:
- Extender `forecast-worker.ts` para processar também jobs diários: acopla dois domínios; um bug no daily insight pode derrubar o pipeline mensal
- Reutilizar `enrich-worker.ts` como base genérica: semântica diferente, mistura responsibilities

**Rationale**: Preserva `forecast-worker.ts` 100% inalterado. Permite deploy, scaling e debug independentes. Custo operacional: um serviço adicional no docker-compose (aceitável).

---

### D3: Discriminador `message_type` em `forecast_ai_messages`

**Escolha**: Coluna `message_type TEXT DEFAULT 'monthly'` com constraint UNIQUE em `(tenant_id, message_date, message_type)`.

**Alternativas consideradas**:
- Nova tabela `forecast_daily_messages`: duplica RLS policy, índices e estrutura idêntica
- Campo prefix no `message_date`: gambiarra, quebra queries existentes

**Rationale**: Migration aditiva — `DEFAULT 'monthly'` preserva todos os registros existentes sem mudança de comportamento. RLS já existente cobre a nova coluna automaticamente.

---

### D4: `probability` derivada da fração de árvores RandomForest

**Escolha**: `probability = n_trees_predicting_positive / n_trees_total` onde "positive" = `predicted_amount > 0`.

**Alternativas consideradas**:
- Calibração isotônica pós-hoc: adiciona complexidade de treino sem ganho claro para UX
- Frequência histórica bruta (occurrences / total_days): ignora o sinal ML

**Rationale**: Simples, interpretável e consistente com o modelo já usado. Risco de superestimação em categorias esparsas é mitigado pelo filtro `occurrences_6m >= 3` na VIEW e `probability >= 0.3` na exibição do hero card.

---

### D5: Fine-tuning como 6ª aba `Treinar`

**Escolha**: Aba dedicada na tabbar.

**Alternativas consideradas**:
- Modal de feedback dentro de `Previsao.tsx`: área de interação limitada para lista de desvios + ratings
- Seção colapsada em `Previsao.tsx`: esconde funcionalidade importante; UX confusa

**Rationale**: A lista de desvios mensais com ratings e tags de motivo precisa de espaço próprio. Sexta aba é natural dado o vocabulário da feature ("treinar o modelo").

---

### D6: Sample weights para feedback negativo (não exclusão de dados)

**Escolha**: Up-weight 3× amostras de `(category_pt, mes_do_ano)` com rating `down` sem `correction_tag` de evento atípico.

**Alternativas consideradas**:
- Excluir amostras marcadas negativamente: reduz dataset, aumenta overfitting
- Re-treinar do zero ignorando feedback: desperdiça sinal de usuário

**Rationale**: Peso máximo de 20% do total de amostras previne overfitting por feedback esporádico. Tags `Viagem`/`Evento especial` são excluídas do ajuste pois representam ruído não-recorrente.

## Risks / Trade-offs

**[Risco] Calibração de probabilidade superestimada em categorias esparsas**
→ Mitigação: filtro `occurrences_6m >= 3` na VIEW; hero card exibido apenas quando `probability >= 0.3` e `occurrences >= 5`

**[Risco] LLM gera texto inadequado para ações sugeridas**
→ Mitigação: mapeamento categoria→ação é pré-definido e injetado como hint estruturado no prompt; LLM preenche apenas a frase personalizada

**[Risco] Over-fitting por feedback de usuário em mês atípico**
→ Mitigação: `correction_tag = 'Viagem'/'Evento especial'` exclui o item do ajuste; feedback contribui no máximo 20% do peso total

**[Risco] Worker diário não executa (cron falha silencioso)**
→ Mitigação: monitoramento por `daily_insight_jobs` stuck em `running` > 10min; fallback: frontend exibe mensagem mensal se 204

**[Trade-off] View ao vivo vs. MATERIALIZED VIEW**
→ Query diária é aceitável com volume atual (~2K transações). Se volume crescer >50K, migrar para MATERIALIZED VIEW com refresh via `pg_cron`.

## Migration Plan

**Deploy order:**
1. Aplicar DDL SQL (views, tabelas, migration de `forecast_ai_messages`) — sem downtime, operações aditivas
2. Deploy do Python trainer com novas funções — o trainer existente continua funcionando para jobs mensais
3. Deploy do `daily-insight-worker` como novo serviço docker-compose
4. Deploy do `daily-insight-cron` (registrar no cron scheduler existente)
5. Deploy do backend com novas rotas
6. Deploy do frontend com hero card + nova aba

**Rollback:**
- Frontend: feature flag por env var `VITE_DAILY_INSIGHTS_ENABLED` (default `true`); se `false`, Previsao.tsx usa só mensagem mensal e aba Treinar não aparece
- Backend: remover registro das 4 rotas do router sem downtime
- Worker: parar serviço docker-compose; jobs em `daily_insight_jobs` ficam `pending` sem efeito colateral

## Open Questions

_Nenhuma — todas as decisões técnicas foram tomadas e documentadas nos ADRs do techspec._
