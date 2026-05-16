## Context

O bronze layer expõe dados brutos da Pluggy em tabelas fiéis à API. Para queries analíticas — via MCP tools ou diretamente — precisamos de dimensões limpas com nomes legíveis, tipos corretos e surrogate keys onde necessário.

As dimensões são a base do star schema. Fatos e cubos serão construídos sobre elas nas próximas changes (`silver-facts`, `gold-cubes`).

**Estado atual**: Dados em `transactions_enriched`, `accounts`, `category_groups`, `category_labels`. Datas como TEXT ISO 8601. IDs como UUID text. Donos como string normalizada em lowercase.

**Família**: Wilson Felipe da Silva + Giulia Cristina Rodrigues de Souza.

## Goals / Non-Goals

**Goals:**
- `d_users`: tabela seed com surrogate key INT para os membros da família
- `d_data`: view de calendário com atributos em PT-BR extraídos das datas reais nas transações
- `d_conta`: view de contas com banco inferido, tipo legível, dono normalizado
- `d_categoria`: view de hierarquia de categorias com nomes em português

**Non-Goals:**
- Não criar fatos (próxima change)
- Não criar cubos OLAP (change `gold-cubes`)
- Não modificar tabelas bronze
- Não usar materialized views nesta change (apenas views regulares + 1 tabela)

## Decisions

**D1: `d_users` como tabela, não view**
`owner_normalized` é texto livre. Uma surrogate key inteira não pode ser derivada de view — precisa de inserção explícita. A tabela é estática (~2-5 linhas), populada via seed SQL no momento da criação. Alternativa considerada: usar hash do nome como ID — rejeitada por ser opaca e instável.

**D2: `d_data` como view sobre transações reais (não spine completa)**
Gerar spine completa (todos os dias de 2020 até hoje) via `generate_series` exigiria parâmetros fixos ou manutenção. Optamos por view que extrai datas distintas das transações reais. Suficiente para o uso via MCP/queries analíticas. Alternativa: tabela de calendário pré-populada — mais correta para BI tools externas, descartada por complexidade desnecessária agora.

**D3: Nomes em português**
As views são consumidas por agentes LLM via MCP. Nomes em português (`mes`, `trimestre`, `dia_semana`) reduzem ambiguidade nas respostas. Colunas técnicas mantêm nome original quando necessário (`account_id`, `item_id`).

**D4: `d_conta` inclui nome do banco inferido**
`items.connector` contém o nome do conector Pluggy (ex: `NUBANK`, `INTER`). Exposto como `banco` na view. Suficiente para análise familiar sem lookups externos.

## Risks / Trade-offs

- **`d_data` sem spine completa** → gaps em datas sem transações. Cubo de cashflow mensal pode ter meses ausentes se não houve transação. Mitigação: aceitável para o escopo atual; pode evoluir para spine completa depois.
- **Seed de `d_users` manual** → se novo membro for adicionado ao Pluggy, precisa de INSERT manual. Mitigação: são 2-5 pessoas; risco baixo.
- **`d_categoria` depende de `category_labels`** → se a tabela estiver vazia, a view retorna apenas categorias brutas sem label PT. Mitigação: verificar no seed se `category_labels` está populada.
