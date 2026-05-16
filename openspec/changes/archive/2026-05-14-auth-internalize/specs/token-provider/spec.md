## MODIFIED Requirements

### Requirement: token servido por container interno
O token Pluggy deve ser obtido de um serviço interno do compose, não de um IP de LAN externo.

#### Scenario: chamada via rede interna do compose
- **WHEN** `api-server` chama `GET http://auth:3000/token`
- **THEN** recebe `{ token, saved_at, expires_at }` válido para autenticar na API Pluggy
