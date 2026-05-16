## ADDED Requirements

### Requirement: seed automático de d_users no enrich
O processo de enrich deve popular `d_users` automaticamente a partir das identidades Pluggy.

#### Scenario: primeiro sync
- **WHEN** `enrich()` é executado após o primeiro sync com a Pluggy
- **THEN** `d_users` é populada com um registro por titular único em `identities`, com `display_name` gerado como primeiro nome em title case

#### Scenario: sync subsequente com customização preservada
- **WHEN** `enrich()` é executado após o usuário ter customizado um `display_name`
- **THEN** o `display_name` customizado é mantido (`ON CONFLICT DO NOTHING`)

#### Scenario: titular sem identidade na Pluggy
- **WHEN** uma conta não tem identidade correspondente em `identities`
- **THEN** as transações dessa conta não aparecem nas views silver/gold (comportamento existente mantido)

### Requirement: listagem de usuários via API
- **WHEN** `GET /api/users` é chamado com JWT válido
- **THEN** retorna array de `{ id, name, display_name }` ordenado por `id`

### Requirement: edição de display_name via API
- **WHEN** `PATCH /api/users/:id { display_name: "Apelido" }` é chamado com JWT válido e `display_name` não-vazio
- **THEN** atualiza `d_users.display_name` e retorna o registro atualizado

#### Scenario: display_name inválido
- **WHEN** `display_name` é vazio ou maior que 50 chars
- **THEN** retorna HTTP 400 com mensagem de erro

### Requirement: modal de configurações no frontend
- **WHEN** usuário clica no ícone ⚙️ no header
- **THEN** abre Dialog listando membros com campo de edição de `display_name` por membro
- **WHEN** usuário salva um `display_name`
- **THEN** `PATCH /api/users/:id` é chamado e feedback de sucesso/erro é exibido na linha correspondente
