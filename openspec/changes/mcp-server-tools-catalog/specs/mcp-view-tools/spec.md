## REMOVED Requirements

### Requirement: Tools de leitura estáticas
**Reason**: O conjunto de tools estaticas legado nao cobre os casos de uso descobertos na sessao e nao representa o contrato alvo de 12 tools tenant-scoped.
**Migration**: Usar o novo catalogo com get_monthly_balance, get_top_categories, get_daily_spending_breakdown, get_spending_by_day_of_week, get_subscription_analysis, get_credit_card_status, get_anomalous_transactions, get_projection, get_raw_transactions, get_digest_status, get_forecast_status e get_pipeline_health.

### Requirement: Tool get_monthly_cashflow com parâmetro months
**Reason**: A ferramenta baseada apenas em months foi substituida por get_monthly_balance com janela explicita start_date/end_date e separacao operacional de eventos.
**Migration**: Substituir chamadas antigas por get_monthly_balance usando intervalo de datas.

### Requirement: Tool get_spending_by_cat com short_days e long_days
**Reason**: A comparacao short/long foi substituida por contrato mais geral de ranking por periodo.
**Migration**: Substituir por get_top_categories com start_date/end_date e limit.

### Requirement: Tool get_top_categories com days e limit
**Reason**: O contrato antigo baseado em days nao cobre todos os filtros e metadados necessarios.
**Migration**: Substituir por get_top_categories no novo formato com start_date/end_date e cashflow_type.

### Requirement: Tool get_budget_5030_20 com spending_days e income_months
**Reason**: A logica fixa 50/30/20 nao representa o foco atual de projecao e diagnostico por buckets.
**Migration**: Substituir por get_daily_spending_breakdown e get_projection.

### Requirement: Parâmetros inválidos retornam erro de validação
**Reason**: O requisito antigo era parcial e acoplado ao catalogo legado.
**Migration**: Aplicar o novo requisito global de validacao para todo o catalogo de 12 tools.

## ADDED Requirements

### Requirement: Catalogo MCP com 12 tools tenant-scoped
O sistema SHALL registrar exatamente 12 tools de leitura para analytics e operacao: get_monthly_balance, get_top_categories, get_daily_spending_breakdown, get_spending_by_day_of_week, get_subscription_analysis, get_credit_card_status, get_anomalous_transactions, get_projection, get_raw_transactions, get_digest_status, get_forecast_status e get_pipeline_health.

#### Scenario: Discovery do catalogo
- **WHEN** um cliente MCP executa tools/list
- **THEN** a resposta inclui as 12 tools do catalogo com descricao e schema de input

### Requirement: Tool get_monthly_balance
A tool get_monthly_balance SHALL aceitar tenant_id, start_date e end_date, e SHALL retornar balanco mensal com receitas_reais, estornos_fatura, despesas_reais, saldo_operacional, total_transacoes e transacoes_reais por mes.

#### Scenario: Consulta de balanco em intervalo valido
- **WHEN** a tool e chamada com datas validas
- **THEN** retorna uma lista mensal ordenada com os campos de balanco definidos no contrato

### Requirement: Tool get_top_categories
A tool get_top_categories SHALL aceitar tenant_id, start_date, end_date, limit opcional e cashflow_type opcional, e SHALL retornar ranking por categoria com total, quantidade, percentual e ticket_medio.

#### Scenario: Ranking com limit customizado
- **WHEN** a tool e chamada com limit igual a 10
- **THEN** retorna ate 10 categorias ordenadas por total decrescente

### Requirement: Tool get_daily_spending_breakdown
A tool get_daily_spending_breakdown SHALL aceitar tenant_id, start_date e end_date, e SHALL retornar agregacao mensal por buckets: parcelas_fixas, contas_energia, juros_multas, assinaturas, diaadia, total_despesas e receitas_reais.

#### Scenario: Breakdown mensal por buckets
- **WHEN** a tool e chamada para um intervalo com despesas
- **THEN** retorna ao menos uma linha mensal com os buckets e totais do periodo

### Requirement: Tool get_spending_by_day_of_week
A tool get_spending_by_day_of_week SHALL aceitar tenant_id, start_date, end_date e category_filter opcional, e SHALL retornar total, quantidade e ticket_medio por dia da semana.

#### Scenario: Consulta com filtro de categorias
- **WHEN** category_filter e informado
- **THEN** a agregacao considera apenas as categorias filtradas

### Requirement: Tool get_subscription_analysis
A tool get_subscription_analysis SHALL aceitar tenant_id, start_date e end_date, e SHALL retornar blocos subscriptions e stopped com sinais de variacao de preco, periodo de atividade e ultima cobranca.

#### Scenario: Deteccao de variacao de preco
- **WHEN** um servico possui mais de um valor unico no periodo
- **THEN** a resposta inclui price_change para esse servico

### Requirement: Tool get_credit_card_status
A tool get_credit_card_status SHALL aceitar tenant_id e SHALL retornar cards com saldo, limite, disponivel, vencimento e status, alem de ultimas_faturas_pagas.

#### Scenario: Cartao sem estouro
- **WHEN** cc_available_credit_limit e maior ou igual a zero
- **THEN** o status retornado para o cartao e ok

### Requirement: Tool get_anomalous_transactions
A tool get_anomalous_transactions SHALL aceitar tenant_id, start_date, end_date, method opcional, threshold opcional e min_samples opcional, e SHALL retornar anomalias com motivo e metadados estatisticos ou de AI.

#### Scenario: Metodo estatistico com amostra suficiente
- **WHEN** uma categoria possui amostras iguais ou acima de min_samples
- **THEN** a deteccao usa regra de desvio padrao conforme threshold

### Requirement: Tool get_projection
A tool get_projection SHALL aceitar tenant_id, target_month e reference_months opcional, e SHALL retornar projecao de fechamento com gastos_ja_ocorridos, projecao_restante, total_projetado_mes, receitas_reais, saldo_projetado e alertas.

#### Scenario: Projecao para mes alvo valido
- **WHEN** a tool e chamada com target_month no formato YYYY-MM
- **THEN** retorna objeto unico de projecao com os campos obrigatorios

### Requirement: Tool get_raw_transactions
A tool get_raw_transactions SHALL aceitar tenant_id, start_date, end_date e filtros opcionais de busca, categoria, faixa de valor, tipo e paginacao, e SHALL retornar transacoes individuais ordenadas por relevancia configurada.

#### Scenario: Consulta com busca textual
- **WHEN** search_term e informado
- **THEN** a resposta inclui apenas transacoes cuja descricao corresponde ao filtro textual

### Requirement: Tool get_digest_status
A tool get_digest_status SHALL aceitar tenant_id, year e month, e SHALL retornar status do digest mensal com cobertura de enrichment e metadados do digest quando disponivel.

#### Scenario: Digest ainda pendente
- **WHEN** nao existe digest para o mes solicitado
- **THEN** a tool retorna status pending ou missing com campos de cobertura preenchidos

### Requirement: Tool get_forecast_status
A tool get_forecast_status SHALL aceitar tenant_id e SHALL retornar disponibilidade de forecast, ultimo treino em forecast_model_meta e resumo de predições futuras quando existentes.

#### Scenario: Sem forecast disponivel
- **WHEN** nao existem linhas validas em forecast_predictions para o tenant
- **THEN** has_forecast e falso e latest_model_meta e retornado quando existir

### Requirement: Tool get_pipeline_health
A tool get_pipeline_health SHALL aceitar include_global opcional e tenant_id opcional, e SHALL retornar status de workers e filas de enrich, digest, forecast e treino ML com metricas operacionais.

#### Scenario: Consulta de saude global
- **WHEN** include_global e true e a chamada possui permissao de operacao
- **THEN** a resposta inclui contadores por fila e estado de workers

### Requirement: Validacao de parametros no catalogo de 12 tools
Todas as tools do catalogo SHALL validar obrigatoriedade, formato e range dos parametros antes de executar qualquer query.

#### Scenario: Range invalido
- **WHEN** uma tool recebe numero fora do range permitido
- **THEN** retorna isError true com mensagem indicando o parametro invalido
