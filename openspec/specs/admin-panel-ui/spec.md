### Requirement: GET /admin serve painel HTML+JS vanilla
O sistema SHALL ter rota `GET /admin` no Bun server que retorna um documento HTML completo com CSS e JS inline. O documento SHALL conter: form de login, seção de tenants e seção de workers. Nenhum arquivo externo (CSS, JS, imagem) é necessário — tudo inline.

#### Scenario: Acesso sem token salvo
- **WHEN** `GET /admin` é acessado em browser sem `admin_token` no `localStorage`
- **THEN** a página exibe apenas o form de login (seções de dados ficam ocultas)

#### Scenario: Acesso com token válido
- **WHEN** `GET /admin` é acessado com `admin_token` válido no `localStorage`
- **THEN** a página busca e exibe dados de tenants e workers automaticamente ao carregar

### Requirement: Login inline chama POST /api/admin/login
O JS da página SHALL fazer `fetch('POST /api/admin/login', { email, password })` ao submeter o form de login. Em sucesso SHALL salvar o token em `localStorage` e exibir as seções de dados. Em falha SHALL exibir mensagem de erro inline no form.

#### Scenario: Login bem-sucedido
- **WHEN** super admin preenche email e senha corretos e submete
- **THEN** token é salvo em localStorage, form de login é ocultado, dados de tenants e workers são carregados

#### Scenario: Credenciais incorretas
- **WHEN** super admin preenche credenciais erradas
- **THEN** exibe "Credenciais inválidas" abaixo do form, sem redirecionar

### Requirement: Seção Tenants — tabela + criação + ativar/desativar
A seção tenants SHALL exibir tabela com colunas: Nome, Email, Último Login, Status. SHALL ter form colapsável para criação com campos: name, email, password, pluggy_email, pluggy_password. Cada linha SHALL ter botão para alternar status (ativar/desativar).

#### Scenario: Listagem de tenants
- **WHEN** página carrega com token válido
- **THEN** `GET /api/admin/tenants` é chamado e tabela é preenchida

#### Scenario: Criação de tenant
- **WHEN** form de novo tenant é submetido com todos os campos
- **THEN** `POST /api/admin/tenants` é chamado; em sucesso, tabela é atualizada sem recarregar a página

#### Scenario: Desativar tenant
- **WHEN** botão "Desativar" de um tenant é clicado
- **THEN** `PATCH /api/admin/tenants/:id { status: "inactive" }` é chamado; linha atualiza status na tabela

### Requirement: Seção Workers — tabela + criação + reativar/remover
A seção workers SHALL exibir tabela com colunas: Nome, URL, Status, Erros. SHALL ter form colapsável para criação com campos: name, ai_base_url, ai_api_key, ai_model. Cada linha SHALL ter botão Reativar (se inativo) e botão Remover.

#### Scenario: Listagem de workers
- **WHEN** página carrega com token válido
- **THEN** `GET /api/admin/workers` é chamado e tabela é preenchida

#### Scenario: Remoção de worker
- **WHEN** botão "Remover" é clicado
- **THEN** `DELETE /api/admin/workers/:id` é chamado; em sucesso, linha é removida da tabela
