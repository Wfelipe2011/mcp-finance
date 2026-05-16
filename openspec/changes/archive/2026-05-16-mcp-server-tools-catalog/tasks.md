## 1. MCP Server Bootstrap

- [x] 1.1 Adicionar dependencias MCP no projeto backend e validar instalacao
- [x] 1.2 Criar entrypoint do servidor MCP HTTP no backend (streamable transport)
- [x] 1.3 Configurar leitura de MCP_PORT e bind local seguro por env
- [x] 1.4 Registrar metadados basicos do servidor e habilitar tools/list e tools/call
- [x] 1.5 Adicionar script de execucao MCP no package.json

## 2. Tenant Safety e Contratos Comuns

- [x] 2.1 Implementar validacao de tenant_id para chamadas sem contexto autenticado
- [x] 2.2 Implementar validacao de coerencia tenant_id versus contexto autenticado
- [x] 2.3 Criar helper comum para executar queries com app.tenant_id setado
- [x] 2.4 Padronizar erros de validacao e execucao em formato isError true
- [x] 2.5 Adicionar validadores de range e formato para parametros de data, limit e threshold

## 3. Tools Financeiras Base (1 a 4)

- [x] 3.1 Implementar get_monthly_balance com agregacao mensal e saldo_operacional
- [x] 3.2 Implementar get_top_categories com cashflow_type, percentual e ticket_medio
- [x] 3.3 Implementar get_daily_spending_breakdown com buckets mensais
- [x] 3.4 Implementar get_spending_by_day_of_week com category_filter opcional
- [x] 3.5 Validar saidas dessas tools com dados reais de tenant

## 4. Tools Financeiras Avancadas (5 a 9)

- [x] 4.1 Implementar get_subscription_analysis com deteccao de price_change e stopped
- [x] 4.2 Implementar get_credit_card_status com cards e ultimas_faturas_pagas
- [x] 4.3 Implementar get_anomalous_transactions com modos ai, stats e hybrid
- [x] 4.4 Implementar get_projection com target_month, reference_months e alertas
- [x] 4.5 Implementar get_raw_transactions com filtros, paginação e limites

## 5. Tools de Estado AI/ML e Operacao (10 a 12)

- [x] 5.1 Implementar get_digest_status com coverage e status ready/pending/missing
- [x] 5.2 Implementar get_forecast_status com latest_model_meta e resumo de predições
- [x] 5.3 Implementar get_pipeline_health com workers e contadores de filas
- [x] 5.4 Restringir escopo global de pipeline para contexto autorizado

## 6. Tool Sync e Integracao Final

- [x] 6.1 Atualizar tool sync para contrato tenant-scoped com resumo enriquecido
- [x] 6.2 Garantir coexistencia entre sync e catalogo de 12 tools no registro MCP
- [x] 6.3 Revisar descricoes de tools para discovery de agentes

## 7. Testes, Verificacao e Documentacao

- [x] 7.1 Criar testes de validacao de input para todas as tools parametrizadas
- [x] 7.2 Criar testes de isolamento tenant (mismatch e ausencia de tenant)
- [x] 7.3 Criar testes de smoke para tools/list e chamadas principais
- [x] 7.4 Executar build do client e checks do backend para validar regressao
- [x] 7.5 Atualizar documentacao operacional do catalogo MCP e exemplos de uso
