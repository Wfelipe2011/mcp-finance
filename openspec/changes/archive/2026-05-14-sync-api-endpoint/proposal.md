## Why

O sync de dados com a Pluggy é feito hoje via `bun run sync` — um comando CLI que bloqueia o terminal por 30-60s. Para quem clona o projeto e não tem acesso ao terminal (ou não quer abrir um), é uma barreira de uso. Com o compose subindo tudo, o terminal do servidor não é acessível de forma conveniente.

Transformar o sync em endpoint HTTP permite que o próprio usuário dispare a atualização de dados diretamente da interface — sem terminal, sem SSH, sem nada além do navegador.

## What Changes

- Novo endpoint `POST /api/sync` que executa o `SyncUseCase` e retorna o summary
- Botão de sync no header do app (ícone 🔄) com estados: idle, loading, sucesso, erro
- Após sync bem-sucedido, a lista de meses disponíveis é atualizada automaticamente
- O endpoint requer autenticação (JWT) — coberto pelo middleware do `app-login`

## Capabilities

### New Capabilities
- `sync-trigger`: Endpoint `POST /api/sync` e botão no header do frontend para disparar sincronização com a Pluggy sob demanda

## Impact

- `src/application/web/routes/sync.ts` — novo handler
- `src/application/web/router.ts` — registro da rota `POST /api/sync`
- `src/application/web/helpers.ts` — `CORS_HEADERS` pode precisar de `POST` nos métodos permitidos
- `client/src/App.tsx` — botão `SyncRoundedIcon` no header com estado de loading
- `client/src/api/client.ts` — função `triggerSync()`
