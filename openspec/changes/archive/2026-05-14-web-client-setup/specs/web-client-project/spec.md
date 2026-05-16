## ADDED Requirements

### Requirement: Projeto React + Vite em client/ inicializável
O sistema SHALL ter um projeto React funcional em `client/` com Vite como bundler, TypeScript, Tremor e Tailwind CSS configurados. `bun run client:build` SHALL gerar `client/dist/` sem erros.

#### Scenario: Build do client bem-sucedido
- **WHEN** desenvolvedor executa `bun run client:build` na raiz
- **THEN** pasta `client/dist/` é criada com `index.html`, assets JS e CSS compilados

#### Scenario: Dev server do client funcional
- **WHEN** desenvolvedor executa `bun run client:dev` na raiz
- **THEN** Vite inicia na porta 5173 com hot reload ativo

#### Scenario: Proxy /api/* configurado em dev
- **WHEN** client em dev faz fetch para `/api/meses`
- **THEN** requisição é proxiada para `http://localhost:3001/api/meses` pelo Vite
