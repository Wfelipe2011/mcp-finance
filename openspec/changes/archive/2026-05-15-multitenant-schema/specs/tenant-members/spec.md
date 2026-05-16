## ADDED Requirements

### Requirement: Tabela tenant_members substituindo d_users
O sistema SHALL ter tabela `tenant_members` com campos: `id` (SERIAL PK), `tenant_id` (UUID NOT NULL REFERENCES tenants(id)), `name` (TEXT NOT NULL — ex: "wilson"), `display_name` (TEXT — ex: "Wilson"), com constraint UNIQUE `(tenant_id, name)`. A tabela `d_users` SHALL ser removida.

#### Scenario: Dois tenants com mesmo nome de membro
- **WHEN** dois tenants diferentes têm um membro com o mesmo `name` (ex: "wilson")
- **THEN** ambos os registros coexistem sem conflito de UNIQUE — o escopo é por tenant

#### Scenario: Mesmo tenant com nome duplicado
- **WHEN** tenta-se inserir membro com `name` já existente para o mesmo `tenant_id`
- **THEN** o banco retorna erro de violação de UNIQUE constraint `(tenant_id, name)`

### Requirement: Seed automático de tenant_members via sync
O sistema SHALL popular `tenant_members` automaticamente durante o sync, inserindo membros distintos a partir de `accounts.owner` com escopo no `tenant_id` corrente. Inserção SHALL usar `ON CONFLICT (tenant_id, name) DO NOTHING` para preservar `display_name` customizados pelo usuário.

#### Scenario: Primeiro sync de um tenant
- **WHEN** o sync é executado para um tenant com contas cujo `owner` é "Wilson Ferreira"
- **THEN** um registro é criado em `tenant_members` com `name='wilson ferreira'`, `display_name='Wilson'` e `tenant_id` do tenant corrente

#### Scenario: Re-sync sem alterar display_name
- **WHEN** o sync é executado novamente para o mesmo tenant
- **THEN** `ON CONFLICT DO NOTHING` preserva o `display_name` que o usuário possa ter customizado

### Requirement: Views silver usam tenant_members
O sistema SHALL atualizar todas as views silver que fazem JOIN com `d_users` para fazer JOIN com `tenant_members`. O RLS do tenant corrente filtra automaticamente os membros do tenant.

#### Scenario: Query em f_transacoes com tenant ativo
- **WHEN** `SELECT * FROM f_transacoes` é executado com `SET LOCAL app.tenant_id` ativo
- **THEN** apenas transações e membros do tenant corrente aparecem no resultado
