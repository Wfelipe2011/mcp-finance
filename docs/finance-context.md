# Finance Context — MCP Copilot Agent

> **Como usar este arquivo**: inclua no contexto do agente via `#file:docs/finance-context.md` em qualquer prompt de análise. O agente deve acrescentar descobertas na seção **Descobertas** com data e descrição.

---

## Visão Geral

Banco de dados pessoal de finanças integrado via **Pluggy** (open banking BR). Os dados são sincronizados periodicamente via `bun run sync` que chama a API Pluggy e persiste no PostgreSQL.

- **Banco**: PostgreSQL 16 (Docker, porta 5434)
- **Conexão MCP**: servidor `postgres-finance` no VS Code, modo `restricted` (somente leitura)
- **Volume de dados**: ~3.291 transações, 89 investimentos, 11 contas, 5 conexões bancárias

---

## Schema

6 tabelas no schema `public`:

### `items` (conexões bancárias)
Representa cada conexão com uma instituição via Pluggy.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy da conexão |
| `connector` | TEXT | Identificador do conector (banco) |
| `status` | TEXT | Status da conexão |
| `execution_status` | TEXT | Status da última execução de sync |
| `products` | TEXT | Produtos habilitados (JSON array serializado) |
| `last_updated_at` | TEXT | Última atualização ISO 8601 |
| `synced_at` | TEXT | Timestamp do último sync local |

### `accounts` (contas e cartões)
Contas bancárias (corrente, poupança) e cartões de crédito.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy da conta |
| `item_id` | TEXT FK→items | Conexão bancária |
| `type` | TEXT | `BANK` ou `CREDIT` |
| `subtype` | TEXT | `CHECKING_ACCOUNT`, `SAVINGS_ACCOUNT`, `CREDIT_CARD` |
| `name` | TEXT | Nome da conta |
| `balance` | NUMERIC(18,4) | Saldo atual |
| `currency_code` | TEXT | Moeda (geralmente `BRL`) |
| `number` | TEXT | Número da conta/cartão (mascarado) |
| `cc_credit_limit` | NUMERIC(18,4) | Limite do cartão (se CREDIT) |
| `cc_available_credit_limit` | NUMERIC(18,4) | Limite disponível |
| `cc_minimum_payment` | NUMERIC(18,4) | Pagamento mínimo da fatura |

### `transactions` (transações bancárias e de cartão)
Principal tabela de movimentações financeiras.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy da transação |
| `account_id` | TEXT FK→accounts | Conta associada |
| `description` | TEXT | Descrição normalizada Pluggy |
| `description_raw` | TEXT | Descrição original da instituição |
| `amount` | NUMERIC(18,4) | Valor (positivo=crédito, negativo=débito) |
| `date` | TEXT | Data da transação ISO 8601 |
| `category` | TEXT | Categoria Pluggy (ex: "Food and Beverage") |
| `category_id` | TEXT | ID da categoria Pluggy |
| `type` | TEXT | `CREDIT` ou `DEBIT` |
| `status` | TEXT | `POSTED` ou `PENDING` |
| `operation_type` | TEXT | Tipo de operação (PIX, TED, etc.) |
| `payment_data` | TEXT | Dados de pagamento (JSON serializado) |
| `cc_bill_id` | TEXT | ID da fatura do cartão |
| `cc_total_installments` | INTEGER | Total de parcelas |
| `cc_installment_number` | INTEGER | Número da parcela atual |
| `merchant` | TEXT | Dados do estabelecimento (JSON serializado) |

### `investments` (ativos financeiros)
Ativos de renda fixa e variável.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy do ativo |
| `item_id` | TEXT FK→items | Conexão bancária |
| `name` | TEXT | Nome do ativo |
| `type` | TEXT | `FIXED_INCOME` ou `EQUITY` |
| `subtype` | TEXT | Subtipo do ativo |
| `balance` | NUMERIC(18,4) | Saldo atual |
| `amount` | NUMERIC(18,4) | Valor investido |
| `amount_profit` | NUMERIC(18,4) | Lucro/rentabilidade |
| `annual_rate` | NUMERIC(18,4) | Taxa anual |
| `due_date` | TEXT | Data de vencimento |
| `status` | TEXT | `ACTIVE` ou `TOTAL_WITHDRAWAL` |

### `investment_transactions` (movimentações de investimento)
Aportes, resgates e movimentações nos ativos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy |
| `investment_id` | TEXT FK→investments | Ativo associado |
| `type` | TEXT | Tipo de movimentação |
| `amount` | NUMERIC(18,4) | Valor |
| `trade_date` | TEXT | Data da operação |
| `net_amount` | NUMERIC(18,4) | Valor líquido (após taxas) |
| `movement_type` | TEXT | Compra/Venda/Resgate/etc |

### `identities` (dados pessoais por conexão)
Uma identidade por item (conexão bancária).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy |
| `item_id` | TEXT FK→items UNIQUE | Conexão bancária (1:1) |
| `full_name` | TEXT | Nome completo |
| `tax_number` | TEXT | CPF |
| `investor_profile` | TEXT | Perfil de investidor |

### Camada Bronze: `transactions_enriched`

Derivada de `transactions` via `TRUNCATE + INSERT … SELECT` a cada sync. Contém as colunas analiticamente úteis de `transactions` + colunas de enriquecimento calculadas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID Pluggy da transação |
| `account_id` | TEXT FK→accounts | Conta associada |
| `description` | TEXT | Descrição normalizada Pluggy |
| `description_raw` | TEXT | Descrição original da instituição |
| `currency_code` | TEXT | Sempre `'BRL'` (normalizado no enriquecimento) |
| `amount` | NUMERIC(18,4) | Valor sempre em BRL (transações USD convertidas via `amount_in_account_currency` do Pluggy; positivo=crédito, negativo=débito) |
| `date` | TEXT | Data da transação ISO 8601 |
| `category` | TEXT | Categoria Pluggy |
| `category_id` | TEXT | ID da categoria Pluggy |
| `status` | TEXT | `POSTED` ou `PENDING` |
| `type` | TEXT | `CREDIT` ou `DEBIT` |
| `operation_type` | TEXT | Tipo de operação (PIX, TED, etc.) |
| `cc_bill_id` | TEXT | ID da fatura do cartão |
| `cc_purchase_date` | TEXT | Data real da compra (vs `date` = data de lançamento) |
| `cc_total_installments` | INTEGER | Total de parcelas |
| `cc_installment_number` | INTEGER | Número da parcela atual |
| `cc_payee_mcc` | INTEGER | MCC do estabelecimento (base para categorização) |
| `transaction_kind` | TEXT NOT NULL | Natureza: `EXPENSE`, `INCOME`, `TRANSFER`, `INVEST` |
| `peer_account_id` | TEXT FK→accounts | Conta par em transferências internas |
| `is_real_cashflow` | BOOLEAN NOT NULL | `true` para EXPENSE/INCOME (exclui transferências e investimentos) |
| `owner_normalized` | TEXT NOT NULL | Titular da conta em minúsculas sem espaços extras (ex: `wilson felipe da silva`) |

**Colunas excluídas de `transactions`** (0% de valor analítico ou já processadas): `balance`, `provider_code`, `merchant`, `acquirer_data`, `cc_card_number`, `provider_id`, `order`, `payment_data`, `created_at`, `updated_at`, `synced_at`.

---

## Domínio e Regras de Negócio

- **Valores**: NUMERIC(18,4). Em `transactions`, débitos têm `amount` negativo e `type = 'DEBIT'`; créditos têm amount positivo e `type = 'CREDIT'`.
- **Datas**: armazenadas como TEXT ISO 8601 (ex: `2024-03-15T00:00:00.000Z`). Para comparar, usar `date::date` ou `LEFT(date, 10)`.
- **JSON serializado**: `payment_data`, `merchant`, `products`, `phone_numbers`, `emails`, `addresses` são TEXT com JSON serializado. Usar `payment_data::jsonb` para consultas JSON no PostgreSQL.
- **Cartão de crédito**: transações de cartão têm `cc_bill_id` preenchido. Parcelas têm `cc_total_installments > 1`.
- **Saldo de contas BANK**: `balance` é o saldo corrente. `closing_balance` é o saldo final do período.
- **PIX**: identificável via `operation_type` ou palavras-chave em `description`.

---

## Descobertas

> Seção para anotar descobertas incrementais durante sessões de análise com o agente.
> Formato: `- **YYYY-MM-DD**: <descoberta>`

<!-- Adicione descobertas abaixo -->
- **2026-05-13**: Modo `restricted` do postgres-mcp bloqueia INSERT/UPDATE/DELETE retornando `"Error validating query"` — sem acesso ao banco, o bloqueio é feito na camada do servidor MCP (análise AST via `pglast`), não na camada do PostgreSQL. Queries SELECT, CTEs e window functions funcionam normalmente.
