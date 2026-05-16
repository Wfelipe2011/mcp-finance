## 1. Banco — Reescrever cube_compromissos_ativos

- [x] 1.1 Em `gold-cubes.sql`, reescrever o GROUP BY de `cube_compromissos_ativos` para `(account_id, cc_total_installments, DATE_TRUNC('month', cc_purchase_date), ROUND(MIN(amount)::NUMERIC, 0))`
- [x] 1.2 Substituir `fp.description` no SELECT por `regexp_replace(MIN(fp.description), 'PARC\d+/\d+', '', 'g')` para remover sufixo de parcela
- [x] 1.3 Substituir `fp.amount` no SELECT por `MIN(fp.amount)` como `amount` canonical (ou amount da 1ª parcela via subquery)
- [x] 1.4 Ajustar `purchase_day` para usar `DATE_TRUNC('month', ...)` em vez de `DATE(...)`
- [x] 1.5 Executar VIEW no banco: `SELECT COUNT(*) FROM cube_compromissos_ativos` deve cair de 193 para ~40-60
- [x] 1.6 Verificar que a formula `compromisso_restante = (MAX(total) - MAX(current)) * amount` ainda está correta com os novos agrupamentos
- [x] 1.7 Validar total de compromissos: `SELECT SUM(compromisso_restante) FROM cube_compromissos_ativos` deve ser similar ao anterior (~R$108k) — só o agrupamento mudou, não os valores
