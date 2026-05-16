## Context

O KPI `kpi_cash_runway` atual calcula o fôlego com base apenas no saldo em conta corrente e poupança (`CHECKING_ACCOUNT` / `SAVINGS_ACCOUNT`). A tabela `investments` já existe no schema com campo `balance` populado pelo sync. A view `cube_patrimonio` não inclui investimentos — ela só faz JOIN de `accounts` com `items`.

O comportamento real do usuário é manter pouco dinheiro na conta corrente e concentrar a reserva em investimentos (CDBs, Tesouro, etc). Isso torna o fôlego imediato sistematicamente baixo (0.0) enquanto o fôlego real (com investimentos) seria muito maior.

## Goals / Non-Goals

**Goals:**
- Expor duas métricas de fôlego via SQL, API e UI: imediato (conta) e total (conta + investimentos)
- Não alterar a lógica de média de despesas (mantém 90d / 3 meses)
- Manter a view `kpi_cash_runway` existente como `kpi_runway_imediato` (renomear, não remover)

**Non-Goals:**
- Diferenciar investimentos por liquidez (D+0 vs D+30 etc) — todos os investimentos são somados
- Calcular rentabilidade futura — apenas saldo atual (`investments.balance`)
- Alterar o pipeline de sync

## Decisions

### D1: Duas views separadas em vez de uma view com múltiplas colunas

**Escolha:** `kpi_runway_imediato` + `kpi_runway_total` como views independentes.

**Alternativa considerada:** Uma única view `kpi_cash_runway` com 6 colunas (saldo imediato, saldo total, runway imediato, runway total). 

**Rationale:** Views independentes são mais fáceis de testar e estender. O custo de uma segunda view é negligível. O endpoint pode fazer dois SELECTs ou um JOIN.

---

### D2: `kpi_runway_total` soma TODOS os investimentos sem filtro de liquidez

**Escolha:** `SUM(investments.balance)` sem filtrar por subtipo.

**Alternativa considerada:** Filtrar apenas `subtype IN ('FIXED_INCOME', ...)` para excluir ilíquidos.

**Rationale:** O Pluggy entrega subtipos variáveis e não temos mapeamento de liquidez. Filtrar incorretamente seria pior do que somar tudo. O contexto familiar tipicamente tem apenas renda fixa de alta liquidez.

---

### D3: Endpoint retorna as duas métricas na mesma response

**Escolha:** `GET /api/runway` retorna `{ runway_imediato_meses, runway_total_meses, saldo_liquido, saldo_investimentos, media_saidas_90d }`.

**Rationale:** Evita criar um novo endpoint. O cliente já chama `/api/runway` — a adição de campos é não-breaking para o frontend (campos extras são ignorados se não usados).

---

### D4: Renomear `kpi_cash_runway` → `kpi_runway_imediato`

**Escolha:** Renomear a view existente para nomenclatura consistente.

**Rationale:** `kpi_cash_runway` é um nome legado. Com duas métricas, a nomenclatura precisa ser clara sobre o que cada uma representa.

## Risks / Trade-offs

- **`investments.balance` pode ser NULL** → Mitigação: `COALESCE(SUM(investments.balance), 0)`
- **Tabela `investments` pode estar vazia** (sync não rodou) → `kpi_runway_total` retorna mesmo valor que `kpi_runway_imediato`, que é o comportamento correto
- **Nome da view renomeado quebra queries existentes** → Mitigação: criar `kpi_runway_imediato` e manter um alias `kpi_cash_runway` como `CREATE VIEW kpi_cash_runway AS SELECT * FROM kpi_runway_imediato` por compatibilidade. Remover o alias em mudança futura.
