## Context

O banco tem ~65 categorias Pluggy em inglês. Para o método 50/30/20, elas precisam ser mapeadas para 3 grupos. A renda (denominador) é a variável mais crítica e mais sensível: a escolha da Opção C (renda observada = média das entradas reais dos 3 últimos meses completos, excluindo ruído) torna o diagnóstico baseado em comportamento real, não em declaração ao banco — que pode estar desatualizada.

A view é implementada com CTEs (Common Table Expressions) para legibilidade: um CTE calcula a renda observada, outro os gastos por grupo, o CTE final une os dois.

O grupo POUPANÇA não é calculado a partir de transações com categoria "Investments" — essas são movimentações brutas que incluem resgates e aportes sem distinção. Em vez disso, POUPANÇA é calculado como `renda_mensal_obs - (gastos_necessidades + gastos_desejos)`, o que representa o que "sobrou" para poupar/investir.

## Goals / Non-Goals

**Goals:**
- `v_budget_5030_20`: 3 linhas fixas — `grupo` ('NECESSIDADES'/'DESEJOS'/'POUPANÇA'), `gasto_30d`, `renda_mensal_obs`, `pct_real`, `pct_ideal`, `delta_pct`, `status`
- Renda observada: `AVG(entradas_reais)` dos 3 últimos meses completos (excluindo o mês atual em andamento), onde entradas_reais usa o mesmo filtro de ruído das outras views
- Mapeamento completo das categorias Pluggy para NECESSIDADES e DESEJOS

**Non-Goals:**
- Não usar `qualInformedIncomeAmount` — está desatualizado e é declaratório (Opção C escolhida)
- Não quebrar por subcategoria dentro de cada grupo
- Não incluir o mês atual na média de renda (mês incompleto distorce)
- Não implementar configuração dinâmica dos percentuais ideais (50/30/20 é fixo)

## Decisions

**D1 — Renda observada = AVG dos 3 últimos meses completos (Opção C)**
Meses completos = onde `SUBSTR(date,1,7) < SUBSTR(DATE('now'),1,7)`. Pega os 3 mais recentes via subquery com `ORDER BY mes DESC LIMIT 3`. Mais representativo que 1 mês (evita outlier) e mais atual que 12 meses.

**D2 — POUPANÇA = renda - (necessidades + desejos)**
Não tenta inferir poupança a partir de movimentações de investimento, que são ruidosas. O que "sobrou" é o proxy mais confiável de poupança real. Quando negativo (gastou mais do que recebeu), `pct_real` é negativo — o modelo interpreta como "déficit".

**D3 — CTEs para organização do SQL**
A view usa `WITH renda AS (...), gastos AS (...) SELECT ...`. SQLite suporta CTEs em views. Alternativa: subqueries aninhadas — legibilidade inferior, mantimento mais difícil.

**D4 — Mapeamento de categorias: NECESSIDADES e DESEJOS explícitos; resto vai para POUPANÇA implicitamente**
Categorias não mapeadas (ex.: Bank fees, Late payment costs) são excluídas dos dois grupos. Elas aparecem nas outras views mas não distorcem o 50/30/20. Se necessário, podem ser adicionadas ao grupo NECESSIDADES no futuro.

**Mapeamento canônico:**

NECESSIDADES (50%):
`Groceries`, `Housing`, `Rent`, `Electricity`, `Gas stations`, `Pharmacy`, `School`, `Education`, `Online Courses`, `Hospital clinics and labs`, `Healthcare`, `Health insurance`, `Insurance`, `Telecommunications`, `Internet`, `Mobile`, `Public transportation`, `Transportation`, `Legal obligations`, `Taxes`, `Automotive`, `Vehicle maintenance`, `Houseware`, `Services`

DESEJOS (30%):
`Shopping`, `Online shopping`, `Eating out`, `Food delivery`, `Food and drinks`, `Electronics`, `Clothing`, `Bookstore`, `Digital services`, `Video streaming`, `Gyms and fitness centers`, `Cinema, theater and concerts`, `Travel`, `Accomodation`, `Car rental`, `Taxi and ride-hailing`, `Parking`, `Tolls and in vehicle payment`, `Pet supplies and vet`, `Sports goods`, `Sports practice`, `Wellness and fitness`, `Bicycle`

## Risks / Trade-offs

- **[Risco] 3 últimos meses podem incluir outliers (fev/2026 com R$60k)** → A média de 3 meses suaviza parcialmente. Mitigação: o modelo pode mencionar "renda estimada baseada nos últimos 3 meses — pode variar".
- **[Risco] Mês com poucos dados (mai/2026 com apenas 10 dias)** → O filtro `< mês atual` exclui corretamente. Apenas meses completos entram.
- **[Trade-off] Categorias não mapeadas são ignoradas no diagnóstico** → Juros, tarifas bancárias e custos financeiros não entram nem em NECESSIDADES nem em DESEJOS. O usuário não vê esses gastos no 50/30/20, mas os vê em `v_spending_by_cat` e `v_top_categories_30d`.
- **[Trade-off] POUPANÇA pode ser negativo** → Reflete a realidade: meses de déficit. O modelo deve comunicar isso claramente como sinal de alerta.
