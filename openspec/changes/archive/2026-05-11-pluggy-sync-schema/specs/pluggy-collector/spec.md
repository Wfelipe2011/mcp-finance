## ADDED Requirements

### Requirement: Listar todas as conexões do usuário
O sistema SHALL buscar todas as conexões (items) do usuário via `GET /items?only_my_items=true` e retornar a lista tipada de Items do domínio.

#### Scenario: Coleta de items bem-sucedida
- **WHEN** a API responde com status 200 e lista de items
- **THEN** o sistema mapeia cada item para a entidade de domínio `Item` e retorna o array

### Requirement: Coletar contas em batch por item
O sistema SHALL buscar todas as contas do usuário em uma única chamada batch via `GET /accounts?itemId=a&itemId=b&...` passando todos os itemIds, e retornar a lista tipada de Accounts.

#### Scenario: Batch de accounts com múltiplos items
- **WHEN** há N items com IDs distintos
- **THEN** o sistema monta uma única URL com N parâmetros `itemId` e retorna todos os accounts mapeados

### Requirement: Coletar investimentos em batch por item
O sistema SHALL buscar todos os investimentos via `GET /investments?itemId=a&itemId=b&...` em uma única chamada batch e retornar a lista tipada de Investments. O campo `transactions[]` inline SHALL ser ignorado — a coleta de investment transactions ocorre via endpoint dedicado.

#### Scenario: Batch de investments com múltiplos items
- **WHEN** há N items com IDs distintos
- **THEN** o sistema retorna todos os investments mapeados, descartando o campo `transactions[]` inline

### Requirement: Coletar transações bancárias por account
O sistema SHALL buscar as transações de cada account via `GET /transactions?accountId={uuid}` e retornar a lista tipada de Transactions. Se a API retornar campos de paginação (`total`, `pageSize`, `page`), o sistema SHALL iterar sobre todas as páginas.

#### Scenario: Coleta de transações de uma conta
- **WHEN** accountId é fornecido e a API responde com status 200
- **THEN** o sistema retorna todas as transações mapeadas para a entidade `Transaction`

#### Scenario: Resposta sem paginação
- **WHEN** a API não retorna campos de paginação
- **THEN** o sistema retorna as transações da resposta única sem tentar paginar

### Requirement: Coletar transações de investimento por investment
O sistema SHALL buscar as transações de cada investment via `GET /investments/{uuid}/transactions` e retornar a lista tipada de InvestmentTransactions.

#### Scenario: Coleta de investment transactions
- **WHEN** investmentId é fornecido e a API responde com status 200
- **THEN** o sistema retorna todas as investment transactions mapeadas

### Requirement: Coletar identidade por item
O sistema SHALL buscar os dados de identidade de cada item via `GET /identity/?itemId={uuid}` e retornar a entidade tipada Identity.

#### Scenario: Coleta de identity com sucesso
- **WHEN** itemId é fornecido e a API responde com status 200
- **THEN** o sistema retorna a entidade Identity mapeada

#### Scenario: Identity não disponível para o item
- **WHEN** a API retorna 404 ou lista vazia para o itemId
- **THEN** o sistema retorna `null` sem lançar erro

### Requirement: Propagar erros HTTP com contexto
O sistema SHALL lançar erros descritivos em caso de resposta HTTP com status 4xx ou 5xx, incluindo o endpoint e o status code na mensagem de erro.

#### Scenario: Erro 401 por token inválido ou expirado
- **WHEN** a API retorna status 401
- **THEN** o sistema lança erro com mensagem indicando falha de autenticação e o endpoint que falhou

#### Scenario: Erro 5xx da API
- **WHEN** a API retorna status 500 ou similar
- **THEN** o sistema lança erro com o endpoint, status code e body da resposta
