# Contexto 04 — Forecast sem ML: Previsão com SQL Views

## Objetivo desta rodada de explore

Substituir os modelos Python de ML (RandomForestRegressor, scikit-learn) por **previsão estatística pura em SQL** usando:
- Views SQL com médias históricas, sazonalidade e tendência
- Sem container Python adicional
- Sem `.pkl` files, sem dependências de ML
- Previsão diária e mensal via queries, não via modelo treinado

---

## Situação atual (ML)

### O que existe hoje

```
src/ml/
  trainer.py        ← RandomForest mensal: treina por tenant, salva em forecast_predictions
  daily_trainer.py  ← RF diário: split 80/20 estratificado, salva em forecast_daily_test_results

docker-compose:
  ml-trainer        ← Container Python com sklearn, pandas, psycopg2
  ml-daily-trainer  ← Container Python separado

Tabelas:
  forecast_predictions       ← output do trainer.py (próximos 3 meses)
  forecast_daily_predictions ← output do daily_trainer.py (próximos 30 dias)
  forecast_model_versions    ← versões de modelo .pkl com MAE, MAPE
  forecast_daily_test_results ← conjunto de teste 20%
  forecast_model_versions    ← histórico de .pkl
  ml_training_jobs           ← fila para disparar treinamento

Volume Docker:
  ml_models/                 ← arquivos .pkl por tenant
```

### Problemas com a abordagem ML

1. **Complexidade de infra**: 2 containers Python adicionais por instância
2. **Cold start**: modelo não existe para novos tenants até primeira rodada de treino
3. **Manutenção**: sklearn, pandas, numpy — stack separado para manter
4. **Acurácia questionável**: com poucos dados (família = poucos meses), RF pode overfittar
5. **`.pkl` stateful**: arquivos no volume não são backup-friendly, migrações complicadas
6. **Feedback loop complexo**: toda a tela "Treinar" existe para corrigir o modelo ML

---

## O que é previsão via SQL?

A ideia é usar **agregações estatísticas simples** que o Postgres suporta nativamente:

### Abordagem 1: Média histórica ponderada por recência

```sql
-- Para prever categoria X no próximo mês:
SELECT
  category_pt,
  AVG(amount) as media_historica,
  -- Peso maior para meses recentes (exponential smoothing simples)
  SUM(amount * (1.0 / (CURRENT_DATE - data_mes + 1))) / 
  SUM(1.0 / (CURRENT_DATE - data_mes + 1)) as media_ponderada,
  STDDEV(amount) as desvio_padrao
FROM cube_gastos_mensais
WHERE tenant_id = $1
  AND data_mes >= NOW() - INTERVAL '6 months'
GROUP BY category_pt
```

### Abordagem 2: Sazonalidade por dia da semana (previsão diária)

```sql
-- Para prever gasto em "Alimentação" em uma quarta-feira:
SELECT
  EXTRACT(DOW FROM data) as dia_semana,
  category_pt,
  AVG(amount) as media_dia,
  COUNT(*) as ocorrencias,
  ROUND(COUNT(*)::numeric / 
    (SELECT COUNT(DISTINCT data) FROM f_transacoes WHERE ...) * 100, 1) as prob_pct
FROM f_transacoes
WHERE tenant_id = $1
  AND EXTRACT(DOW FROM data) = EXTRACT(DOW FROM NOW())
  AND data >= NOW() - INTERVAL '3 months'
GROUP BY dia_semana, category_pt
ORDER BY media_dia DESC
```

### Abordagem 3: Regressão linear simples no Postgres

O Postgres tem funções de regressão nativas:

```sql
-- Tendência de crescimento/queda de uma categoria
SELECT
  category_pt,
  REGR_SLOPE(amount, EXTRACT(EPOCH FROM data_mes)) as tendencia_por_dia,
  REGR_INTERCEPT(amount, EXTRACT(EPOCH FROM data_mes)) as intercepto,
  CORR(amount, EXTRACT(EPOCH FROM data_mes)) as correlacao
FROM cube_gastos_mensais
WHERE tenant_id = $1
GROUP BY category_pt
```

---

## O que substituímos vs. o que mantemos

### Substituído (ML Python)
```
trainer.py → forecast_predictions (mensal)
  Substituir por: VIEW forecast_monthly_projection
  Cálculo: média ponderada últimos 6 meses + ajuste de tendência via REGR_SLOPE

daily_trainer.py → forecast_daily_predictions
  Substituir por: VIEW forecast_daily_probability
  Cálculo: frequência histórica por (DOW, category) × valor médio

forecast_model_versions → REMOVE (não há mais .pkl)
forecast_daily_test_results → REMOVE (não há mais teste de modelo)
ml_training_jobs → REMOVE (não há mais treinamento)
```

### Mantemos (não muda)
```
forecast_ai_messages       ← worker LLM continua gerando mensagens humanizadas
forecast_jobs              ← cron continua enfileirando geração de mensagens
daily_habit_signals (view) ← já é uma view SQL, usa diretamente
forecast_user_feedback     ← feedback do usuário (pode alimentar ajuste de pesos)
```

### Novo
```
VIEW forecast_monthly_projection  ← substitui forecast_predictions
VIEW forecast_daily_probability   ← substitui forecast_daily_predictions
  → ambas usam funções SQL nativas: AVG, STDDEV, REGR_SLOPE, CORR
```

---

## Vantagens desta mudança

| Aspecto | ML Python | SQL Views |
|---|---|---|
| **Containers** | +2 (trainer, daily-trainer) | 0 adicional |
| **Estado externo** | Arquivos .pkl em volume | Apenas tabelas Postgres |
| **Cold start** | Sem previsão até 1ª rodada | Funciona com qualquer dado histórico |
| **Transparência** | Caixa preta | Query auditável |
| **Acurácia (poucos dados)** | Overfitting real | Estatísticas simples mais robustas |
| **Manutenção** | sklearn, pandas, psycopg2 | SQL puro |
| **Tela "Treinar"** | Interface complexa necessária | Pode simplificar muito |

---

## Questões para o explore

1. **Qualidade da previsão**: Com `REGR_SLOPE` e médias ponderadas, a previsão vai ser "boa o suficiente" para o usuário? O objetivo é insight, não precisão de trading.
2. **`daily_habit_signals` (view existente)**: já agrega `(DOW, category, avg_amount, frequency)` — podemos usá-la diretamente para o card de previsão diária sem nenhuma mudança?
3. **`cube_gastos_mensais`**: essa view já existe? Tem dados suficientes para REGR_SLOPE?
4. **Tela "Treinar"**: sem ML, o que resta da tela Treinar? Vira uma tela de "Ajustes de Previsão" onde o usuário pode marcar categorias que não quer ver na previsão?
5. **Migração de dados**: `forecast_predictions` existente tem dados gerados pelo ML. Mantemos por compatibilidade ou removemos tudo?

---

## Arquivos-chave para a change

### Backend
| Arquivo | Papel |
|---|---|
| `src/infrastructure/db/forecast.sql` | Criar as 2 novas views |
| `src/infrastructure/db/BunPgAdapter.ts` | Substituir métodos que leem `forecast_predictions` pelas views |
| `src/application/web/routes/forecast/` | Endpoints de previsão — adaptar retorno |
| `src/application/cron/forecast-cron.ts` | Manter (ainda enfileira geração de mensagem LLM) |
| `docker-compose.yml` | **Remover** serviços `ml-trainer` e `ml-daily-trainer` |
| `Dockerfile.ml-trainer` | **Remover** |
| `Dockerfile.ml-daily` | **Remover** |

### ML (remoção)
| Arquivo | Papel |
|---|---|
| `src/ml/trainer.py` | **Remover ou arquivar** |
| `src/ml/daily_trainer.py` | **Remover ou arquivar** |

### Frontend
| Arquivo | Papel |
|---|---|
| `client/src/tabs/Treinar.tsx` | Simplificar — sem versões de modelo, sem conjunto de teste |
| `client/src/components/TreinarDiario.tsx` | Avaliar o que ainda faz sentido |
| `client/src/tabs/Previsao.tsx` | Consumir as novas views |
| `client/src/api/types.ts` | Remover tipos relacionados ao ML |

---

## Referências

- **Postgres regression functions**: https://www.postgresql.org/docs/current/functions-aggregate.html#FUNCTIONS-AGGREGATE-STATISTICS-TABLE
  - `REGR_SLOPE(Y, X)` — inclinação da regressão linear
  - `REGR_INTERCEPT(Y, X)` — intercepto
  - `CORR(Y, X)` — coeficiente de correlação
  - `STDDEV_SAMP()` — desvio padrão amostral
- **`daily_habit_signals` view existente**: `src/infrastructure/db/BunPgAdapter.ts` → `this.forecast.getDailyHabitSignals()`
- **Exponential smoothing em SQL**: https://momjian.us/main/blogs/pgblog/2019.html#October_6_2019

---

## Dependência com outros contextos

- **Contexto 03 (Admin/Roles)**: sem ML, a tela Admin não precisa mais de "Versões do modelo" e "Re-treinar"
- **Contexto 01 (Navegação)**: a simplificação da tela "Treinar" afeta quanto espaço ela ocupa no menu
- **Contexto 02 (Workers)**: remove `ml_training_jobs` da lista de filas do supervisor

---

## Sugestão de escopo para a change

**Change 1 — Views SQL substitutas:**
1. Criar `VIEW forecast_monthly_projection` usando REGR_SLOPE + médias
2. Criar `VIEW forecast_daily_probability` usando `daily_habit_signals` + DOW
3. Atualizar endpoints de forecast para usar as views
4. Validar que o card "Previsão" no frontend funciona sem mudança de contrato

**Change 2 — Remoção de infra ML:**
1. Remover containers `ml-trainer` e `ml-daily-trainer` do `docker-compose.yml`
2. Remover `Dockerfile.ml-trainer` e `Dockerfile.ml-daily`
3. Arquivar `src/ml/` (não deletar — pode ser útil como referência)
4. Remover tabelas ML obsoletas (migration DROP)

**Change 3 — UI Treinar simplificada:**
1. Sem versões de modelo → mostrar apenas "Categorias excluídas da previsão"
2. Feedback simples: o usuário marca categorias que atrapalham a previsão
