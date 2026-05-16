## 1. docker-compose.yml — adicionar mounts das views

- [x] 1.1 No serviço `postgres` de `docker-compose.yml`, renomear o mount existente de `schema.sql` para `01-schema.sql` (mantendo o arquivo fonte inalterado)
- [x] 1.2 Adicionar mount `./src/infrastructure/db/silver-dimensions.sql:/docker-entrypoint-initdb.d/02-silver-dimensions.sql:ro`
- [x] 1.3 Adicionar mount `./src/infrastructure/db/gold-ai.sql:/docker-entrypoint-initdb.d/03-gold-ai.sql:ro`
- [x] 1.4 Adicionar mount `./src/infrastructure/db/silver-facts.sql:/docker-entrypoint-initdb.d/04-silver-facts.sql:ro`
- [x] 1.5 Adicionar mount `./src/infrastructure/db/gold-cubes.sql:/docker-entrypoint-initdb.d/05-gold-cubes.sql:ro`

## 2. Verificação

- [x] 2.1 Executar `docker compose down -v && docker compose up -d postgres` e confirmar que todos os 5 arquivos são aplicados sem erros no log do container
- [x] 2.2 Confirmar existência das views: `\dv` no psql deve mostrar `f_transacoes`, `f_investimentos`, `f_fluxo_caixa`, `d_categoria`, `d_conta`, `d_data`
- [x] 2.3 Confirmar existência da tabela `ai_transaction_insights` e dos materialized views `cube_cashflow_mensal`, `cube_gastos_categoria`, `cube_gastos_conta`, `cube_patrimonio_mensal`
