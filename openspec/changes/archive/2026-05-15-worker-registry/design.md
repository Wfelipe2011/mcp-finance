## Context

O Bun tem `Bun.spawn()` para criar processos filhos e `proc.exitCode` para detectar término. O `BunPgAdapter` será atualizado pelo change `multitenant-schema` para ter a tabela `workers`. O supervisor é um processo Bun de longa duração — similar ao `server.ts` mas sem HTTP.

## Goals / Non-Goals

**Goals:**
- Super admin pode cadastrar, listar, atualizar e remover workers via API
- Supervisor reconcilia workers a cada 10 minutos (spawn/kill por delta)
- Processos filhos que morrem são detectados; erros em série desativam o worker
- `last_seen_at` atualizado implicitamente via `markDone`/`markError` (sem heartbeat separado)

**Non-Goals:**
- Dashboard visual de workers (o super admin panel é CLI-friendly no MVP)
- Reinicialização automática imediata de workers com crash (reconcile de 10 min é suficiente)
- Escalabilidade horizontal (supervisor único por instância no MVP)
- Autenticação de worker por API key (workers são processos filhos locais no MVP)

## Decisions

### D1: Super admin autenticado via env vars

**Escolhido**: `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` no `.env`. Login via `POST /api/admin/login` retorna JWT com `{ role: 'super_admin' }`.

**Rationale**: Não precisa de tabela ou bcrypt — comparação direta com env vars (timing-safe). Padrão existente em `routes/auth.ts` atual. Super admin é uma única conta global, não um tenant.

### D2: Supervisor como processo separado (não thread do servidor)

**Escolhido**: `bun run supervisor` como processo independente.

**Alternativas**: `setInterval` dentro do `server.ts`.

**Rationale**: Falha no supervisor não derruba o servidor HTTP. Restart independente. Logs separados. O Docker Compose gerencia os dois processos separadamente.

### D3: Reconcile por delta — não reinicia workers ativos

**Escolhido**: O supervisor mantém um `Map<workerId, ChildProcess>`. A cada 10 min:
- Workers no DB que não estão no Map → spawn
- Processos no Map cujo workerId não está mais no DB como `active` → kill

Workers ativos existentes não são reiniciados. Se o admin muda `ai_model` de um worker existente sem mudar o `id`, o supervisor precisa de sinalização especial (fora do escopo do MVP — criar novo worker e desativar o antigo é o fluxo recomendado).

### D4: Auto-deactivação por crashes em série

Quando `proc.on('exit', code)` detecta saída não-zero:
```
workers.error_count++
workers.last_seen_at = NOW()
if error_count >= 5:
  workers.status = 'error'
else:
  // será reiniciado no próximo reconcile
```

**Rationale**: 5 crashes antes de desativar dá margem para problemas transitórios de rede/API. Workers com `status='error'` não são respawnados até o admin resetar para `active`.

## Risks / Trade-offs

- **Reconcile de 10 min atrasa novos workers** → admin cadastra worker mas ele só começa em até 10 min. Mitigation: endpoint `POST /api/admin/workers/:id/restart` pode forçar reconcile imediato (pode ser implementado futuramente).
- **Supervisor como SPOF** → se o supervisor morrer, todos os workers param. Mitigation: `restart: always` no Docker Compose. No MVP, aceitável.
- **`SUPER_ADMIN_PASSWORD` em plaintext no .env** → risco aceito no MVP, mesmo padrão do `APP_PASSWORD` atual.

## Migration Plan

1. Adicionar env vars `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` ao `.env` e `.env.example`
2. Criar rotas admin com middleware de super admin
3. Implementar supervisor
4. Adicionar ao `docker-compose.yml`

## Open Questions

- *(Resolvido)* Workers são processos Bun locais (não dispositivos externos) ✓
- *(Resolvido)* Reconcile por delta (Opção A) ✓
- *(Resolvido)* 1 worker = 1 modelo AI ✓
