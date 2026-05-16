## ADDED Requirements

### Requirement: Obter bearer token do serviço local
O sistema SHALL buscar o bearer token via HTTP GET em `http://192.168.0.194:4567/token`, extrair o campo `token` do primeiro elemento do array retornado e retorná-lo como string para uso nas chamadas à API do Pluggy.

#### Scenario: Token válido retornado com sucesso
- **WHEN** o serviço local responde com status 200 e array com ao menos um elemento contendo `token` e `expires_at`
- **THEN** o sistema retorna a string do `token` para o chamador

### Requirement: Validar expiração do token
O sistema SHALL verificar o campo `expires_at` do token retornado e logar um warning quando o token já estiver expirado, mas NÃO abortar a execução.

#### Scenario: Token expirado mas presente
- **WHEN** `expires_at` é uma data/hora anterior ao momento atual
- **THEN** o sistema loga um warning com a data de expiração e continua a execução retornando o token

#### Scenario: Token válido dentro do prazo
- **WHEN** `expires_at` é uma data/hora futura
- **THEN** o sistema retorna o token sem logar warnings

### Requirement: Falhar explicitamente se o serviço de token não responder
O sistema SHALL lançar um erro com mensagem descritiva se o serviço local de token retornar status != 200 ou se a resposta não contiver um array com ao menos um elemento.

#### Scenario: Serviço indisponível ou resposta inválida
- **WHEN** o serviço retorna status diferente de 200 ou corpo não é array com elementos
- **THEN** o sistema lança uma exceção com mensagem clara indicando falha ao obter token
