## Why

O bronze layer contém dados brutos e enriquecidos da Pluggy, mas sem um modelo dimensional as queries analíticas são complexas, lentas e difíceis de ler. A camada prata introduz dimensões — views que expõem contexto limpo (quem, quando, onde, o quê) — sobre as quais os fatos e cubos OLAP serão construídos.

## What Changes

- Cria tabela `d_users` com surrogate key inteira (seed de membros da família)
- Cria view `d_data` com spine de calendário extraído das transações (ano, mês, trimestre, dia da semana em PT-BR)
- Cria view `d_conta` com contas enriquecidas (tipo, subtipo, banco, dono)
- Cria view `d_categoria` com hierarquia de categorias (category_pt, category_group_pt, group_code)
- Todas as views usam nomes em português para facilitar uso por agentes analíticos

## Capabilities

### New Capabilities

- `silver-d-users`: Tabela de membros da família com surrogate key inteira e nome normalizado
- `silver-d-data`: View de dimensão de tempo com atributos de calendário em PT-BR
- `silver-d-conta`: View de dimensão de contas bancárias e cartões
- `silver-d-categoria`: View de dimensão de categorias e grupos de gastos

### Modified Capabilities

<!-- nenhuma -->

## Impact

- Nenhuma tabela bronze é modificada — apenas leitura
- `d_users` é a única tabela nova criada (seed manual, ~2-5 linhas)
- Views dependem de: `transactions_enriched`, `accounts`, `items`, `category_groups`, `category_labels`
- Futuras changes `silver-facts` e `gold-cubes` dependem dessas dimensões
