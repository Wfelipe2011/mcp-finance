## MODIFIED Requirements

### Requirement: Obter bearer token do serviço local
O sistema SHALL buscar o bearer token via HTTP GET no endpoint configurado pela variável de ambiente `TOKEN_URL` (padrão: `http://auth:3000/token`), extrair o campo `token` do objeto JSON retornado e retorná-lo como string para uso nas chamadas à API do Pluggy. O campo `token` SHALL conter um JWT `accessToken` válido para autenticar requisições em `my-api.pluggy.ai` via `Authorization: Bearer {token}`.

#### Scenario: Token válido retornado com sucesso
- **WHEN** o serviço de auth responde com status 200 e objeto JSON contendo `token` e `expires_at`
- **THEN** o sistema retorna a string do `token` (JWT accessToken) para o chamador

#### Scenario: Token expirado mas presente
- **WHEN** `expires_at` é uma data/hora anterior ao momento atual
- **THEN** o sistema loga um warning com a data de expiração e continua a execução retornando o token

#### Scenario: Token válido dentro do prazo
- **WHEN** `expires_at` é uma data/hora futura
- **THEN** o sistema retorna o token sem logar warnings

#### Scenario: Serviço indisponível ou resposta inválida
- **WHEN** o serviço retorna status diferente de 200 ou corpo não contém campo `token`
- **THEN** o sistema lança uma exceção com mensagem clara indicando falha ao obter token
