## 1. Adicionar GET /token no auth/app

- [x] 1.1 Criar `auth/app/src/routes/token.routes.ts` com `GET /` handler
- [x] 1.2 Criar `auth/app/src/controllers/token.controller.ts` que lê `PLUGGY_EMAIL`/`PLUGGY_PASSWORD` do env, chama `LoginAutomationService.execute()` e retorna `{ token: appSession, saved_at, expires_at }`
- [x] 1.3 Registrar a rota em `auth/app/src/routes/index.ts` como `/token`
- [x] 1.4 Em `auth/app/src/config/env.ts`, adicionar `pluggyEmail` e `pluggyPassword` como `optional()` (sem required — serão validados no controller com mensagem clara)

## 2. Atualizar docker-compose.yml da raiz

- [x] 2.1 Adicionar serviço `auth` com `build: ./auth/app`, variáveis `PLUGGY_EMAIL`, `PLUGGY_PASSWORD`, `GMAIL_LINK_SENDER`, `PORT: "3000"`
- [x] 2.2 Adicionar volumes `./auth/data:/app/data` e `./auth/screenshots:/app/screenshots`
- [x] 2.3 Em `api-server`, adicionar `depends_on: auth: condition: service_started`
- [x] 2.4 Não expor porta do `auth` ao host por padrão

## 3. Criar diretórios de persistência

- [x] 3.1 Criar `auth/data/.gitkeep` e `auth/screenshots/.gitkeep` para garantir que as pastas existem no repo mas o conteúdo é ignorado
- [x] 3.2 Adicionar `auth/data/` e `auth/screenshots/` ao `.gitignore`

## 4. Validar

- [x] 4.1 Rodar `docker compose build auth` e confirmar build bem-sucedida
- [x] 4.2 Chamar `GET http://localhost:3000/token` (com porta exposta temporariamente) e confirmar retorno `{ token, saved_at, expires_at }`
- [x] 4.3 Confirmar que `api-server` consegue fazer sync chamando `bun run sync` com `TOKEN_URL=http://localhost:3000/token`
