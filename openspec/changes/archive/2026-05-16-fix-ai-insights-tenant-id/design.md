## Context

O `BunPgAdapter` usa RLS (Row Level Security) via `set_config('app.tenant_id', tid, true)` dentro de transações para isolar dados por tenant. O parâmetro `is_local=true` restringe o config à transação ativa.

O método `aiInsights.upsertOne()` foi implementado usando `current_setting('app.tenant_id')::UUID` no INSERT, assumindo que o parâmetro estaria definido na sessão. Porém, o worker chama `upsertOne()` **fora** de qualquer transação — portanto `app.tenant_id` não está definido e o PostgreSQL lança `unrecognized configuration parameter`.

## Goals / Non-Goals

**Goals:**
- Corrigir o INSERT para usar o `tid` do closure diretamente, eliminando a dependência de `current_setting`
- Resetar jobs com status `error` causados exclusivamente por este bug para que sejam reprocessados
- Manter compatibilidade com o restante do sistema (RLS via `set_config` continua funcionando para as outras queries)

**Non-Goals:**
- Alterar a arquitetura de RLS
- Modificar como outras queries do `BunPgAdapter` usam `set_config`
- Adicionar novos testes automatizados

## Decisions

**Decisão: usar `${tid}` diretamente em vez de `current_setting`**

O `tid` está disponível no closure do construtor do `BunPgAdapter`. A query original usou `current_setting` provavelmente para seguir o padrão de RLS — mas `upsertOne` é chamado **após** `getUnenrichedById` (que encerra sua transação), então `app.tenant_id` não existe mais na sessão.

Alternativas descartadas:
- Envolver `upsertOne` num `sql.begin()` com `set_config` → funciona, mas é overhead desnecessário para um INSERT simples sem necessidade de leitura RLS
- Usar `set_config` global (sem `is_local`) → perigoso em pool compartilhado, viola o isolamento

**Decisão: resetar jobs com `error` e `attempts >= 3` do bug**

Jobs que chegaram a 3 tentativas por este bug ficaram permanentemente travados. O reset limpa o estado para permitir reprocessamento.

## Risks / Trade-offs

- [Risk] Jobs que falharam por outros motivos (não o bug do tenant_id) serão resetados também → Mitigação: o `error_msg` pode ser verificado; aceito como risco baixo dado que `ai_transaction_insights` está vazia e nenhum insight foi salvo ainda.

## Migration Plan

1. Aplicar fix no `BunPgAdapter.ts`
2. Rebuild e restart do container `supervisor` (que spawna os workers)
3. SQL de reset dos jobs com erro:
   ```sql
   UPDATE enrich_jobs SET status = 'pending', attempts = 0, error_msg = NULL WHERE status = 'error';
   ```
4. Workers retomam automaticamente os jobs resetados
