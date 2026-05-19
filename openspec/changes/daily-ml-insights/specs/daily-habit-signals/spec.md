## ADDED Requirements

### Requirement: View agrega padrões de gasto diário por tenant
O sistema SHALL criar a view `daily_habit_signals` no schema público que agrega transações de despesa (amount < 0) por `(tenant_id, day_of_week, day_of_month, category_pt, group_pt)` incluindo `occurrences`, `avg_amount`, `std_amount` e `occurrences_6m`.

#### Scenario: View retorna apenas despesas
- **WHEN** a view é consultada para um tenant com receitas e despesas
- **THEN** apenas linhas com `amount < 0` são incluídas no agregado

#### Scenario: View aplica filtro de ocorrências mínimas
- **WHEN** uma combinação (category_pt, day_of_week) tem menos de 3 ocorrências históricas
- **THEN** essa combinação NÃO aparece nos resultados da view (cláusula HAVING COUNT(*) >= 3)

#### Scenario: View resolve categoria com fallback
- **WHEN** `dc.category_pt` é NULL mas `te.category_pt` está preenchido
- **THEN** a view usa `te.category_pt` como fallback; se ambos NULL usa 'Sem Categoria'

### Requirement: View é scoped por tenant via tenant_members
O sistema SHALL derivar o `tenant_id` da view através de `JOIN tenant_members tm ON tm.id = te.user_id` garantindo isolamento multi-tenant correto.

#### Scenario: Dados de tenants distintos não se misturam
- **WHEN** dois tenants têm transações no mesmo dia da semana e categoria
- **THEN** cada tenant recebe seus próprios agregados independentes

### Requirement: View expõe `occurrences_6m` para filtro de recência
O sistema SHALL incluir a coluna `occurrences_6m` com contagem de ocorrências nos últimos 6 meses para que consumidores filtrem sinais relevantes.

#### Scenario: occurrences_6m conta apenas período recente
- **WHEN** uma categoria tem 10 ocorrências históricas mas 0 nos últimos 6 meses
- **THEN** `occurrences_6m = 0` e a linha ainda aparece (filtro de exibição é responsabilidade do consumidor)
