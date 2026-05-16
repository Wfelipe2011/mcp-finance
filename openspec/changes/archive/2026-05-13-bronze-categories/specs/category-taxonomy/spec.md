## ADDED Requirements

### Requirement: Tabela category_groups com grupos pai em PT-BR
O sistema SHALL ter uma tabela `category_groups` com as seguintes colunas: `group_id TEXT PRIMARY KEY` (2 primeiros dígitos do `category_id` Pluggy), `name_pt TEXT NOT NULL` (nome do grupo em português). A tabela SHALL ser populada com seed estático via `INSERT ... ON CONFLICT DO NOTHING`.

#### Scenario: Grupo de alimentação identificado
- **WHEN** a tabela `category_groups` é consultada com `group_id = '11'`
- **THEN** o resultado contém `name_pt = 'Alimentação'`

#### Scenario: Grupo de transporte identificado
- **WHEN** a tabela `category_groups` é consultada com `group_id = '19'`
- **THEN** o resultado contém `name_pt = 'Transporte'`

#### Scenario: Seed idempotente
- **WHEN** o seed de `category_groups` é executado múltiplas vezes
- **THEN** não há erro e não há duplicatas

### Requirement: Tabela category_labels com tradução PT-BR por category_id
O sistema SHALL ter uma tabela `category_labels` com as seguintes colunas: `category_id TEXT PRIMARY KEY` (código Pluggy, ex: `'11010000'`), `name_pt TEXT NOT NULL` (nome em português, ex: `'Restaurante'`), `group_id TEXT NOT NULL REFERENCES category_groups(group_id)`. A tabela SHALL conter todas as 74 categorias Pluggy presentes no dataset.

#### Scenario: Categoria de restaurante traduzida
- **WHEN** `category_labels` é consultada com `category_id = '11010000'`
- **THEN** o resultado contém `name_pt = 'Restaurante'` e `group_id = '11'`

#### Scenario: Categoria de supermercado traduzida
- **WHEN** `category_labels` é consultada com `category_id = '10000000'`
- **THEN** o resultado contém `name_pt = 'Supermercado'` e `group_id = '10'`

#### Scenario: Cobertura completa das categorias Pluggy
- **WHEN** `SELECT COUNT(*) FROM category_labels` é executado
- **THEN** o resultado é 74 (número de categorias distintas no dataset)

#### Scenario: Integridade referencial com category_groups
- **WHEN** uma linha é inserida em `category_labels` com `group_id` inexistente em `category_groups`
- **THEN** a inserção falha com erro de FK
