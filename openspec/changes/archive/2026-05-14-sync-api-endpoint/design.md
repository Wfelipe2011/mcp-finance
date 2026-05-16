## Context

`SyncUseCase` já encapsula toda a lógica de sync. O script `src/scripts/sync.ts` cria as deps e chama `useCase.run()`. A migração para um handler HTTP é trivial — o mesmo padrão de todos os outros routes.

O desafio é o tempo de execução: 30-60s. Precisamos de uma estratégia de timeout e feedback para o usuário.

## Goals / Non-Goals

**Goals:**
- `POST /api/sync` que executa `SyncUseCase.run()` e retorna `SyncSummary` como JSON
- Botão no header com CircularProgress durante execução
- Toast de sucesso com resumo (X transações sincronizadas em Xs)
- Toast de erro se falhar
- Atualização automática da lista de meses após sync bem-sucedido

**Non-Goals:**
- SSE/WebSocket para progresso em tempo real (over-engineering para uso pessoal)
- Agendamento automático de sync (cron) — o usuário dispara manualmente
- Histórico de syncs
- Sync de apenas um período específico

## Decisions

### Estratégia de timeout

`fetch` com `signal: AbortController` de 120s. O Bun server não tem timeout de request configurado, então o servidor aguarda o `SyncUseCase.run()` terminar. O frontend aguarda até 120s antes de mostrar timeout.

Em 99% dos casos o sync termina em <60s. 120s é margem segura.

### Botão no header

```
  App.tsx header — estado do botão de sync:

  idle      → <SyncRoundedIcon />              clicável
  loading   → <CircularProgress size={20} />   desabilitado
  success   → <SyncRoundedIcon color="success"> por 2s, depois idle
  error     → <SyncRoundedIcon color="error">  por 3s, depois idle
```

Toast com `Snackbar` + `Alert` do MUI mostrando:
- Sucesso: "Sincronizado: 1234 transações em 42.3s"
- Erro: "Erro no sync: <mensagem>"

### Atualização pós-sync

Após sync bem-sucedido, re-chamar `fetchMeses()` para atualizar o `MonthPicker`. Se o mês selecionado ainda existe, mantém a seleção. Se não existe (não deveria acontecer), seleciona o mais recente.

### CORS para POST

`helpers.ts` tem `Access-Control-Allow-Methods: "GET, OPTIONS"`. Precisa adicionar `POST`. O `server.ts` já trata `OPTIONS` para CORS preflight — verificar se precisa ajuste para POST.

### Instância de BunPgAdapter

O handler de sync precisa de uma instância do `BunPgAdapter` e do `TokenHttpAdapter`. Os outros routes já instanciam `BunPgAdapter` localmente. O sync route seguirá o mesmo padrão — instância local, conexão fechada no finally.

```typescript
// routes/sync.ts
const db = new BunPgAdapter();
const tokenPort = new TokenHttpAdapter();
// SyncUseCase usa esses como deps
```

## Risks / Trade-offs

- **Conexão do browser**: se o usuário fechar o navegador durante o sync, o SyncUseCase continua rodando no servidor mas o resultado é perdido. Aceitável — o sync completa e os dados ficam no banco.
- **Sync concorrente**: dois cliques rápidos disparariam dois SyncUseCases simultâneos. Mitigação: desabilitar o botão durante loading (no frontend). Sem lock no servidor — desnecessário para uso pessoal.
- **Erro de token Pluggy**: se o `auth` container estiver reiniciando e o token não estiver cacheado, o sync falha. O erro é exibido no frontend normalmente.
