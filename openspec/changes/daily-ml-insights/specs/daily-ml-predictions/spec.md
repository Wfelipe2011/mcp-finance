## ADDED Requirements

### Requirement: Trainer gera previsões diárias para os próximos 30 dias
O sistema SHALL estender o `trainer.py` para, após o treinamento mensal, chamar `generate_daily_predictions()` produzindo uma linha em `forecast_daily_predictions` para cada combinação `(tenant_id, prediction_date, category_pt)` dos próximos 30 dias a partir da data de execução.

#### Scenario: Previsões cobrem exatamente 30 dias futuros
- **WHEN** o trainer executa para um tenant
- **THEN** `forecast_daily_predictions` contém linhas com `prediction_date` de D+1 até D+30

#### Scenario: Previsões são substituídas a cada execução
- **WHEN** o trainer executa pela segunda vez para o mesmo tenant
- **THEN** linhas existentes com as mesmas `(tenant_id, prediction_date, category_pt)` são substituídas (UPSERT via UNIQUE constraint)

### Requirement: Tabela `forecast_daily_predictions` armazena bounds e probabilidade
O sistema SHALL criar a tabela com colunas: `id BIGSERIAL PK`, `tenant_id UUID FK`, `prediction_date DATE`, `category_pt TEXT`, `group_pt TEXT`, `predicted_amount NUMERIC(18,2)`, `lower_bound NUMERIC(18,2)`, `upper_bound NUMERIC(18,2)`, `probability NUMERIC(5,4)`, `model_version TEXT DEFAULT 'v1'`, `created_at TIMESTAMP DEFAULT NOW()`.

#### Scenario: Constraint UNIQUE previne duplicatas
- **WHEN** o trainer insere previsão para (tenant_id, prediction_date, category_pt) já existente
- **THEN** a linha existente é atualizada (ON CONFLICT DO UPDATE), não duplicada

#### Scenario: probability está no intervalo válido
- **WHEN** o trainer calcula a probabilidade de gasto para uma categoria
- **THEN** `probability` está entre 0.0 e 1.0 (inclusive)

### Requirement: Trainer aplica feedback do usuário via sample weights no re-treino
O sistema SHALL implementar `load_user_feedback()` e `apply_feedback_weights()`: quando o job tem `trigger = 'user_feedback'`, itens com rating `down` sem `correction_tag` de evento atípico recebem peso 3× na amostra de treino, limitado a 20% do peso total.

#### Scenario: Feedback de evento atípico é excluído do ajuste de peso
- **WHEN** um item de feedback tem `correction_tag IN ('Viagem', 'Evento especial')`
- **THEN** esse item NÃO aumenta o peso da amostra correspondente

#### Scenario: Peso de feedback é limitado a 20% do total
- **WHEN** há muitos feedbacks negativos para uma categoria
- **THEN** a contribuição total de feedback não ultrapassa 20% do peso total de amostras de treino

### Requirement: Trainer mantém compatibilidade com pipeline mensal existente
O sistema SHALL garantir que as novas funções são chamadas APÓS o treinamento mensal existente, sem modificar assinaturas de funções já existentes.

#### Scenario: Pipeline mensal executa normalmente sem feedback
- **WHEN** o job não tem `trigger = 'user_feedback'`
- **THEN** `apply_feedback_weights()` não é chamada e o treino mensal ocorre como antes
