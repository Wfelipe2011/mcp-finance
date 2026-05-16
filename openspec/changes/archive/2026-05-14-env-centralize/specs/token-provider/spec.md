## MODIFIED Requirements

### Requirement: TOKEN_URL sem hardcode de IP
O `TokenHttpAdapter` não deve conter nenhum IP ou hostname hardcoded. O default deve ser o nome do container no compose.

#### Scenario: default via container name
- **WHEN** `TOKEN_URL` não está definida
- **THEN** o adapter usa `http://auth:3000/token`
