## Context

O sistema atual possui um `trainer.py` que treina um RandomForestRegressor no grão mensal (`cube_gastos_mensais`) e usa os resultados para gerar predições diárias via heurísticas sobre `daily_habit_signals` (uma VIEW agregada). Esse design não permite split treino/teste real, avaliação de acurácia por dia/categoria, nem fine-tune iterativo com feedback do usuário.

O `daily_habit_signals` agrega contagens e médias — não preserva o grão individual por data. Para um trainer diário real, precisamos das transações brutas: `transactions_enriched` agrupadas por `(date, category_pt)`.

O modelo mensal (`trainer.py`) continuará operando normalmente. O novo `daily_trainer.py` é um processo independente com ciclo de vida próprio.

## Goals / Non-Goals

**Goals:**
- Trainer diário com dados reais no grão `(date, category_pt)`, features temporais e split 80/20 estratificado por categoria
- Persistência versionada em `.pkl` + metadados em banco (`forecast_model_versions`)
- Loop iterativo de fine-tune: usuário vê test-set ordenado por desvio → dá 👎 → re-treina sem aqueles pares → avalia novamente
- Exclusão de categorias inteiras do treinamento (`forecast_category_exclusions`)
- Ativação explícita do modelo: `staging → production`; deleção de `.pkl` para arquivar
- Tela IA unificada no menu com sub-abas (Insights · Previsões · Treinar)
- Card de insights navegável entre dias com mensagem LLM disponível

**Non-Goals:**
- Alteração do `trainer.py` mensal existente
- Algoritmos além de RandomForest (sem LSTM, XGBoost, etc. nesta change)
- Retreinamento automático — o usuário controla quando treinar e quando ativar
- Previsões além de 30 dias

## Decisions

### 1. Script separado: `daily_trainer.py` + `Dockerfile.ml-daily`

**Decisão:** Script Python dedicado, container separado no docker-compose, volume `ml_models` compartilhado.

**Alternativas consideradas:**
- Adicionar ao `trainer.py` existente — rejeitado: mistura grão mensal e diário, dificulta manutenção e falha num interrompe o outro.
- Monorepo Python com módulos — excesso de engenharia para o escopo atual.

**Racional:** Separação de responsabilidades; container dedicado pode ser escalado ou substituído independentemente.

### 2. Split 80/20 estratificado por categoria (aleatório dentro de cada categoria)

**Decisão:** Para cada categoria, embaralhar suas linhas com `random_state=42` e reservar 20% para teste.

```
Para cada categoria C:
  linhas_C = df[df.category_pt == C].sample(frac=1, random_state=42)
  n_test = max(1, int(len(linhas_C) * 0.20))
  test  += linhas_C.iloc[:n_test]
  train += linhas_C.iloc[n_test:]
```

**Alternativas consideradas:**
- Split temporal (últimos 20% por data) — mais realista para forecasting, mas o usuário pediu aleatório.
- StratifiedShuffleSplit do sklearn — equivalente, mas a implementação manual é mais legível e flexível para aplicar exclusões antes do split.

### 3. Persistência de modelos: joblib `.pkl` em volume Docker

**Decisão:** `joblib.dump(pipeline, f"/models/{tenant_id}/{version}.pkl")`. Nome de versão: `daily-v{YYYYMMDD}-{HHMMSS}`. Registro em `forecast_model_versions` com `file_path`.

**Alternativas consideradas:**
- Banco de dados binário (BYTEA) — dificulta debug e aumenta tamanho do banco.
- S3/MinIO — overkill para ambiente local; adiciona dependência externa.

**Racional:** `joblib` já está no Dockerfile; volume Docker persiste entre reinicializações; path simples, sem dependências externas.

### 4. Ativação explícita: `staging → production`

**Decisão:** Novo modelo nasce como `staging`. Usuário avalia resultados e clica "Ativar". O sistema marca o anterior como `archived` (sem deletar `.pkl` automaticamente — usuário decide deletar).

**Racional:** Evita que um modelo ruim vá a produção automaticamente. O usuário tem controle total sobre o que está gerando previsões.

### 5. `forecast_category_exclusions` como tabela separada de `forecast_daily_exclusions`

**Decisão:** Duas tabelas distintas:
- `forecast_category_exclusions(tenant_id, category_pt)` — categoria excluída globalmente do treino
- `forecast_daily_exclusions(tenant_id, transaction_date, category_pt, correction_tag)` — par (data, categoria) atípico, marcado via 👎

**Racional:** Semânticas completamente diferentes. Exclusão de categoria é permanente (configura o modelo). Exclusão de par (date, category) é granular (fine-tune por ocorrência atípica).

### 6. Coluna `model_version` em `forecast_daily_predictions` já existe

A coluna `model_version TEXT NOT NULL DEFAULT 'v1'` já existe na tabela. Quando o modelo `staging` ou `production` gera predições, salva o `version_name` correspondente. Sem migração necessária.

### 7. Navegação do card de insights: somente dias com `forecast_ai_messages`

**Decisão:** `GET /api/forecast/daily/messages-range` retorna array de datas com mensagem disponível. O card navega somente entre essas datas.

**Racional:** Dias sem mensagem LLM não têm contexto suficiente para exibir. Mostrar dados brutos sem narrativa seria confuso para o usuário.

### 8. Tela IA no bottom nav: 6 itens (remove "Previsão" e "🧠 Treinar", adiciona "IA")

**Decisão:** Bottom nav passa de 7 para 6 itens. O item "IA" abre `IaScreen.tsx` com sub-abas: **Insights** (card navegável) · **Previsões** (forecast mensal atual) · **Treinar** (treino diário).

**Racional:** 7 itens no bottom nav mobile é excessivo. Consolida conceitos relacionados em uma tela coesa.

## Risks / Trade-offs

- **Dados escassos por categoria** → Com poucos meses de histórico, categorias com <5 linhas terão MAE de alta variância. Mitigação: exibir aviso quando `num_test < 3` para uma categoria.
- **Volume de `.pkl` acumulando** → Múltiplas versões `staging` sem ativar podem acumular. Mitigação: UI mostra tamanho do arquivo e alerta quando >5 versões `staging` existem.
- **Container `ml-daily-trainer` sem volume** → Sem o volume `ml_models`, modelos são perdidos a cada rebuild. Mitigação: volume nomeado no `docker-compose.yml`; healthcheck valida path.
- **Split aleatório vs temporal** → O split aleatório pode incluir datas "futuras" no treino e "passadas" no teste, o que não é realista para séries temporais. Trade-off aceito explicitamente pelo usuário em troca de garantia de cobertura por categoria.
- **Categorias excluídas ainda aparecem nas predições antigas** → `forecast_daily_predictions` existentes não são deletadas ao excluir uma categoria. Próxima ativação de modelo não gerará novas predições para essa categoria. Mitigação: documentar comportamento na UI.

## Migration Plan

1. Adicionar volume `ml_models` no `docker-compose.yml` (sem downtime)
2. Aplicar migrations SQL (4 novas tabelas, sem alterações em tabelas existentes)
3. Fazer build do novo container `ml-daily-trainer` (sem afetar serviços existentes)
4. Novo endpoint de treino disponível imediatamente; modelo não é ativado automaticamente
5. Bottom nav atualizado no frontend (mudança visual pura, sem perda de funcionalidade)

**Rollback:** Reverter `docker-compose.yml` e frontend. As 4 novas tabelas podem permanecer sem efeito colateral.

## Open Questions

- Qual ícone usar para o item "IA" no bottom nav? (sugestão: `AutoAwesomeRounded` ou `PsychologyRounded`)
- O trainer diário deve rodar em schedule automático (como o mensal) ou somente sob demanda via API? (sugestão: somente sob demanda para esta change)
