## ADDED Requirements

### Requirement: Servidor serve arquivos estáticos do bundle React
O sistema SHALL servir arquivos estáticos de `client/dist/` para rotas que não começam com `/api/`. Se o arquivo não existir, serve `client/dist/index.html` (SPA fallback).

#### Scenario: Arquivo estático existente
- **WHEN** cliente requisita `GET /assets/main.js`
- **THEN** server retorna o arquivo de `client/dist/assets/main.js` com Content-Type correto

#### Scenario: Rota de navegação SPA
- **WHEN** cliente requisita `GET /gastos` (rota React)
- **THEN** server retorna `client/dist/index.html` com status `200`

#### Scenario: client/dist ausente em ambiente de desenvolvimento
- **WHEN** a pasta `client/dist/` não existe
- **THEN** server retorna `404` com mensagem `"Client not built. Run 'bun run client:build' first."`

#### Scenario: Rotas /api/ não são interceptadas pelo static handler
- **WHEN** cliente requisita qualquer `GET /api/*`
- **THEN** requisição é roteada para os handlers de API, não para arquivos estáticos
