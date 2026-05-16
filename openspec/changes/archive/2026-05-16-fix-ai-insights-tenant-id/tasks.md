## 1. Fix BunPgAdapter

- [x] 1.1 Em `src/infrastructure/db/BunPgAdapter.ts`, no método `aiInsights.upsertOne()`, substituir `current_setting('app.tenant_id')::UUID` por `${tid}::uuid` no INSERT SQL

## 2. Rebuild e restart

- [x] 2.1 Rebuildar a imagem Docker com `docker compose build supervisor`
- [x] 2.2 Reiniciar o supervisor com `docker compose restart supervisor`

## 3. Reset dos jobs com erro

- [x] 3.1 Executar SQL para resetar jobs falhos de volta a pending:
  ```sql
  UPDATE enrich_jobs SET status = 'pending', attempts = 0, error_msg = NULL WHERE status = 'error';
  ```

## 4. Validação

- [x] 4.1 Verificar nos logs do supervisor que os workers processam jobs sem erros de `app.tenant_id`
- [x] 4.2 Confirmar que `ai_transaction_insights` começa a ser populada (SELECT COUNT(*) > 0)
