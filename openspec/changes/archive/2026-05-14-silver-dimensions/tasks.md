## 1. Tabela d_users

- [x] 1.1 Criar tabela `d_users` com colunas `id SERIAL PRIMARY KEY`, `name TEXT NOT NULL`, `display_name TEXT NOT NULL`
- [x] 1.2 Inserir seed: Wilson (`wilson felipe da silva`, `'Wilson'`) e Giulia (`giulia cristina rodrigues de souza`, `'Giulia'`)
- [x] 1.3 Verificar que JOIN `d_users.name = transactions_enriched.owner_normalized` retorna match para todas as transações com `owner_normalized` não-nulo

## 2. View d_data

- [x] 2.1 Criar view `d_data` que extrai `DISTINCT date::DATE` de `transactions_enriched`
- [x] 2.2 Adicionar colunas: `year`, `month`, `month_name_pt` (CASE 1→'Janeiro'…12→'Dezembro'), `quarter`, `quarter_label` (CASE 1→'T1'…4→'T4'), `day_of_week`, `day_name_pt` (CASE 1→'Domingo'…7→'Sábado'), `is_weekend`
- [x] 2.3 Testar: consultar `d_data` e verificar atributos para uma data conhecida

## 3. View d_conta

- [x] 3.1 Criar view `d_conta` com JOIN `accounts INNER JOIN items ON accounts.item_id = items.id`
- [x] 3.2 Expor colunas: `account_id`, `nome`, `tipo`, `subtipo`, `banco` (de `items.connector`), `dono` (LOWER(accounts.owner)), `limite_credito` (`cc_credit_limit`), `moeda` (`currency_code`)
- [x] 3.3 Testar: verificar que contas CREDIT têm `limite_credito` não-nulo

## 4. View d_categoria

- [x] 4.1 Criar view `d_categoria` com LEFT JOIN `category_groups` e `category_labels`
- [x] 4.2 Expor: `category_id`, `category_pt` (label PT ou fallback), `group_code`, `group_pt`
- [x] 4.3 Testar: verificar que todos os `group_code` de `category_groups` aparecem na view

## 5. Validação final

- [x] 5.1 Confirmar que nenhuma tabela bronze foi alterada (apenas SELECT)
- [x] 5.2 Confirmar que `d_users`, `d_data`, `d_conta`, `d_categoria` são acessíveis sem erros
