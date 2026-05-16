## 1. BunPgAdapter — aceitar SQL externo

- [x] 1.1 Adicionar parâmetro `sql?: SQL` ao construtor de `BunPgAdapter` e flag `private ownsSql: boolean`
- [x] 1.2 Quando `sql` externo for fornecido, usar `this.sql = sql` e `this.ownsSql = false`
- [x] 1.3 Quando `sql` não for fornecido, manter comportamento atual: `this.sql = new SQL(url)` e `this.ownsSql = true`
- [x] 1.4 Modificar `close()` para chamar `this.sql.close()` apenas se `this.ownsSql === true`

## 2. Singleton SQL no servidor web

- [x] 2.1 Em `server.ts`, criar `const sharedSql = new SQL(url)` antes de `Bun.serve()`
- [x] 2.2 Registrar `process.on('SIGTERM', ...)` e `process.on('SIGINT', ...)` para fechar `sharedSql` no shutdown
- [x] 2.3 Passar `sharedSql` para a função `router()` como parâmetro adicional

## 3. Router — propagar SQL para os handlers

- [x] 3.1 Atualizar assinatura de `router(req, url, tenantId, sql)` para aceitar o `SQL` compartilhado
- [x] 3.2 Passar `sql` para cada chamada de handler que cria `BunPgAdapter`

## 4. Handlers de rota — receber SQL externo

- [x] 4.1 `routes/gastos.ts` — receber `sql` e passar para `new BunPgAdapter(tenantId, sql)`
- [x] 4.2 `routes/runway.ts` — idem
- [x] 4.3 `routes/meses.ts` — idem
- [x] 4.4 `routes/transacoes.ts` — idem
- [x] 4.5 `routes/compromissos.ts` — idem
- [x] 4.6 `routes/patrimonio.ts` — idem
- [x] 4.7 `routes/cashflow.ts` — idem (2 instâncias)
- [x] 4.8 `routes/tendencias.ts` — idem
- [x] 4.9 `routes/investimentos.ts` — idem
- [x] 4.10 `routes/digest.ts` — idem
- [x] 4.11 `routes/users.ts` — idem (2 instâncias)
- [x] 4.12 `routes/sync.ts` — receber `sql`, passar ao adapter, remover `try/finally db.close()` (não é mais necessário)
- [x] 4.13 `routes/admin/tenants.ts` — receber `sql` e passar às 3 instâncias de `BunPgAdapter`
- [x] 4.14 `routes/admin/workers.ts` — receber `sql` e passar às 4 instâncias de `BunPgAdapter`

## 5. Validação de build e teste

- [x] 5.1 Rodar `bun run typecheck` (ou equivalente) na raiz para verificar sem erros TypeScript
- [x] 5.2 Subir o ambiente Docker e verificar `pg_stat_activity` — conexões idle devem ser < 15
- [x] 5.3 Navegar pela UI (gastos, cashflow, runway, transações) e confirmar que dados carregam normalmente
- [x] 5.4 Executar sync e confirmar que funciona sem erro 500
- [x] 5.5 Confirmar que requests de tenants diferentes retornam apenas seus próprios dados (isolamento RLS)
