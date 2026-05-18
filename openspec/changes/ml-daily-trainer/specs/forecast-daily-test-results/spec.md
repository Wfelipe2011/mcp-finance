## ADDED Requirements

### Requirement: Tabela de resultados do conjunto de teste
O sistema SHALL persistir os resultados do conjunto de teste (20%) em `forecast_daily_test_results`, associados ao `version_name` do modelo treinado, para visualização e feedback do usuário.

#### Scenario: Resultados salvos após treinamento
- **WHEN** `daily_trainer.py` avalia o modelo no conjunto de teste
- **THEN** cada par (data, categoria) do conjunto de teste é salvo em `forecast_daily_test_results` com `predicted_amount`, `actual_amount`, `deviation_pct = (predicted - actual) / actual * 100` e `version_name`

#### Scenario: Resultados ordenados por desvio absoluto
- **WHEN** a API retorna os resultados do teste para a UI
- **THEN** retorna ordenados por `ABS(deviation_pct) DESC`, colocando os maiores desvios primeiro

#### Scenario: Indicador de cor por magnitude de desvio
- **WHEN** a UI exibe um resultado de teste
- **THEN** mostra indicador vermelho para `|deviation_pct| > 50%`, amarelo para `20-50%`, verde para `<20%`

#### Scenario: Exclusão via 👎 gera entrada em forecast_daily_exclusions
- **WHEN** o usuário clica 👎 em um resultado do conjunto de teste
- **THEN** o par `(transaction_date, category_pt)` é inserido em `forecast_daily_exclusions` e o item é marcado como excluído na UI

#### Scenario: Re-treino usa exclusões acumuladas
- **WHEN** o usuário clica "Re-treinar"
- **THEN** o novo ciclo de treino carrega `forecast_daily_exclusions` do tenant e filtra esses pares antes do split 80/20

#### Scenario: Resultados específicos por versão
- **WHEN** a API é consultada para os resultados de uma versão específica
- **THEN** retorna apenas os resultados com `version_name` correspondente
