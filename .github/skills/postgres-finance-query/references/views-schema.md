# Schema das Views — finance DB

## Views de Cubo (agregações mensais, filtradas por tenant via RLS)

### `cube_cashflow_mensal`
Receitas, despesas e saldo por mês.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês (1–12) |
| `month_name_pt` | text | Nome do mês em português |
| `total_receitas` | numeric | Soma de todas as entradas (INCOME) |
| `total_despesas` | numeric | Soma de todas as saídas (EXPENSE) |
| `saldo_liquido` | numeric | total_receitas − total_despesas |
| `num_receitas` | bigint | Quantidade de transações de entrada |
| `num_despesas` | bigint | Quantidade de transações de saída |
| `total_emprestimos` | numeric | Entradas classificadas como OPERACAO_CREDITO |
| `total_receitas_operacionais` | numeric | total_receitas − total_emprestimos |

> **UI usa:** `total_receitas_operacionais` para exibir "Receitas" (quando disponível).

---

### `cube_cashflow_projetado`
Projeção de fluxo de caixa para meses futuros.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês |
| `month_name_pt` | text | Nome do mês |
| `total_receitas` | numeric | Receitas projetadas |
| `total_despesas` | numeric | Despesas projetadas |
| `saldo_liquido` | numeric | Saldo projetado |
| `is_projected` | boolean | `true` = projeção, `false` = dado real |

---

### `cube_gastos_grupo_mensal`
Gastos agrupados por categoria de alto nível, por mês.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês |
| `month_name_pt` | text | Nome do mês |
| `group_pt` | text | Nome do grupo (ex: "Alimentação", "Transporte") |
| `num_transacoes` | numeric | Quantidade de transações |
| `total_gastos` | numeric | Total gasto no grupo |
| `ticket_medio` | numeric | Ticket médio por transação |

---

### `cube_gastos_categoria_mensal`
Gastos por subcategoria, por mês.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês |
| `month_name_pt` | text | Nome do mês |
| `group_pt` | text | Grupo pai |
| `category_pt` | text | Categoria específica |
| `num_transacoes` | numeric | Quantidade |
| `total_gastos` | numeric | Total gasto |
| `ticket_medio` | numeric | Ticket médio |

---

### `cube_gastos_mensais`
Gastos detalhados com display_name (descrição da transação).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês |
| `month_name_pt` | text | Nome do mês |
| `group_pt` | text | Grupo |
| `category_pt` | text | Categoria |
| `display_name` | text | Descrição da transação |
| `num_transacoes` | bigint | Quantidade |
| `total_gastos` | numeric | Total |

---

### `cube_investimentos_mensal`
Movimentações de investimentos por mês.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `year` | integer | Ano |
| `month` | integer | Mês |
| `month_name_pt` | text | Nome do mês |
| `investment_name` | text | Nome do investimento |
| `investment_type` | text | Tipo (ex: FIXED_INCOME) |
| `investment_subtype` | text | Subtipo |
| `movement_type` | text | PURCHASE ou REDEMPTION |
| `num_movimentacoes` | bigint | Quantidade de movimentações |
| `total_bruto` | numeric | Valor bruto |
| `total_liquido` | numeric | Valor líquido |

---

### `cube_patrimonio`
Saldo atual de cada conta/investimento do tenant.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `account_id` | text | ID da conta |
| `nome` | text | Nome da conta |
| `tipo` | text | BANK, CREDIT, INVESTMENT |
| `subtipo` | text | CHECKING_ACCOUNT, SAVINGS_ACCOUNT, etc. |
| `banco` | text | Nome do banco |
| `dono` | text | Nome do owner_normalized |
| `moeda` | text | BRL, USD, etc. |
| `saldo_atual` | numeric | Saldo atual |
| `limite_credito` | numeric | Limite (só para CREDIT) |
| `credito_disponivel` | numeric | Limite − saldo usado |

> **Fôlego imediato** usa apenas subtipo `CHECKING_ACCOUNT` e `SAVINGS_ACCOUNT`.

---

### `cube_compromissos_ativos`
Parcelas de cartão de crédito ainda em aberto.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `description` | text | Descrição da compra |
| `purchase_day` | date | Data da compra |
| `amount` | numeric | Valor da parcela |
| `account_id` | text | Conta do cartão |
| `cartao` | text | Nome do cartão |
| `dono` | text | Dono |
| `category_pt` | text | Categoria |
| `category_group_pt` | text | Grupo |
| `installment_atual` | integer | Parcela atual (ex: 3) |
| `total_installments` | integer | Total de parcelas (ex: 12) |
| `compromisso_restante` | numeric | Valor restante a pagar |

---

### `cube_tendencias`
Gastos recorrentes detectados nos últimos meses.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `tipo` | text | Tipo de tendência |
| `nome` | text | Nome |
| `merchant` | text | Estabelecimento |
| `valor` | numeric | Valor médio |
| `meses_presentes` | bigint | Em quantos meses apareceu |
| `period` | text | Período analisado |

---

## Views de Fato (transações base, filtradas por RLS)

### `f_transacoes`
Todas as transações enriquecidas do tenant. JOIN de `transactions_enriched` com `tenant_members` via `owner_normalized`.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `transaction_id` | text | ID da transação |
| `account_id` | text | ID da conta |
| `user_id` | integer | ID em `tenant_members` |
| `category_id` | text | ID da categoria |
| `date_day` | date | Data (convertida para America/Sao_Paulo) |
| `amount_signed` | numeric | Positivo=receita, negativo=despesa |
| `amount_raw` | numeric | Valor original |
| `transaction_kind` | text | INCOME, EXPENSE, INVEST, TRANSFER |
| `is_real_cashflow` | boolean | Se é fluxo de caixa real |
| `description` | text | Descrição |
| `category_pt` | text | Categoria em português |
| `category_group` | text | Grupo (código) |
| `category_group_pt` | text | Grupo em português |
| `owner_normalized` | text | Nome normalizado do dono |

---

### `f_fluxo_caixa`
Filtro de `f_transacoes` onde `is_real_cashflow = true`. Exclui transferências internas e aportes em investimentos.

Mesmas colunas de `f_transacoes`.

> **Esta é a view que alimenta `cube_cashflow_mensal`.**

---

### `f_parcelas`
Transações que são parcelas de cartão de crédito.

Inclui todas as colunas de `f_transacoes` mais:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `purchase_day` | date | Data original da compra |
| `installment_number` | integer | Número da parcela atual |
| `total_installments` | integer | Total de parcelas |
| `is_installment` | boolean | Se é parcelado |
| `is_first_installment` | boolean | Se é a primeira parcela |
| `installments_remaining` | integer | Parcelas restantes |

---

### `f_parcelas_futuras`
Parcelas ainda não cobradas (projeções futuras).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `projected_month` | date | Mês de vencimento da parcela |
| `installment_seq` | integer | Sequência da parcela |
| `installment_amount` | numeric | Valor da parcela |
| `description` | text | Descrição |
| `owner_normalized` | text | Dono |
| `category_pt` | text | Categoria |
| `category_group_pt` | text | Grupo |
| `account_id` | text | Conta |
| `total_installments` | integer | Total de parcelas |
| `installments_remaining` | integer | Restantes |

---

## KPIs de Fôlego (runway)

### `kpi_runway_imediato`
Fôlego baseado só em saldo de conta corrente/poupança.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `saldo_liquido` | numeric | Saldo em CHECKING + SAVINGS |
| `media_saidas_90d` | numeric | Média de despesas dos últimos 3 meses |
| `runway_imediato_meses` | numeric | saldo / media (em meses) |

> **UI exibe:** `ROUND(runway_imediato_meses * 30)` dias

---

### `kpi_runway_total`
Fôlego considerando conta + investimentos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `saldo_liquido` | numeric | Saldo em CHECKING + SAVINGS |
| `saldo_investimentos` | numeric | Saldo total em investimentos |
| `media_saidas_90d` | numeric | Média de despesas dos últimos 3 meses |
| `runway_total_meses` | numeric | (saldo + investimentos) / media |

> **UI exibe:** `ROUND(runway_total_meses * 30)` dias

---

### `kpi_cash_runway`
Versão simplificada sem separar investimentos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `saldo_liquido` | numeric | Saldo líquido |
| `media_saidas_90d` | numeric | Média de saídas |
| `runway_meses` | numeric | Fôlego em meses |

---

## Dimensões (sem RLS — dados de referência global)

### `d_categoria`
Mapeamento de categorias Pluggy → português.

| Coluna | Tipo |
|--------|------|
| `category_id` | text |
| `category_pt` | text |
| `group_code` | text |
| `group_pt` | text |

### `d_conta`
Metadados de contas (sem saldo — use `cube_patrimonio` para saldo).

| Coluna | Tipo |
|--------|------|
| `account_id` | text |
| `nome` | text |
| `tipo` | text |
| `subtipo` | text |
| `banco` | text |
| `dono` | text |
| `limite_credito` | numeric |
| `moeda` | text |

### `d_data`
Calendário para joins temporais.

| Coluna | Tipo |
|--------|------|
| `data` | date |
| `year` | integer |
| `month` | integer |
| `month_name_pt` | text |
| `quarter` | integer |
| `quarter_label` | text |
| `day_of_week` | integer |
| `day_name_pt` | text |
| `is_weekend` | boolean |
