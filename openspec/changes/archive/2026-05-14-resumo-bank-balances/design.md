## Context

O componente `Resumo.tsx` usa `fetchCashflow(month)` e `fetchRunway()`. O `kpi_cash_runway` já usa o saldo real das contas (`R$3.202,44`) para calcular fôlego. Mas esse saldo é mostrado apenas de forma implícita ("0.3 meses de fôlego").

O endpoint `/api/patrimonio` retorna:
```json
{
  "items": [ { "nome", "tipo", "banco", "dono", "saldo_atual", ... } ],
  "total_patrimonio": 3202.44
}
```

`fetchPatrimonio()` e os tipos `Patrimonio`/`PatrimonioItem` já existem em `client.ts` e `types.ts` — usados pela aba Investimentos.

## Goals / Non-Goals

**Goals:**
- Exibir saldo atual por banco no Resumo, como card dedicado
- Mostrar apenas contas `tipo = 'BANK'` com `saldo_atual > 0`
- Mostrar total em conta e lista de bancos com valor individual
- Reutilizar `fetchPatrimonio()` sem criar nova API

**Non-Goals:**
- Mostrar faturas de crédito (cartões) no Resumo — esses ficam em Investimentos
- Criar novo componente reutilizável de alto nível (usar inline em Resumo.tsx ou componente simples)
- Adicionar gráfico (o Donut já existe em Investimentos; aqui é só lista)

## Decisions

### Decisão: Card separado, não embutido no card de cashflow

O usuário pediu "card separado" — fica após o card de Receitas/Despesas, antes do DigestNarrative ou ao final da aba.

**Ordem de cards no Resumo:**
1. Card: Resultado do Mês (saldo_liquido)
2. Card: DigestNarrative (análise AI)
3. Card: Receitas / Despesas / Fôlego
4. **[NOVO]** Card: Saldo em Conta (bancos)

### Decisão: Reutilizar fetchPatrimonio() com useEffect paralelo

Adicionar `fetchPatrimonio()` no `Promise.all` do `useEffect` existente em `Resumo.tsx`. Não depende do mês selecionado (saldo é sempre atual).

### Decisão: Mostrar por banco, não por conta

Nubank (Wilson) + Nubank (Giulia) = exibir como linhas separadas com dono visível. Não agregar por banco — transparência é melhor.

## Risks / Trade-offs

- **[Risco]** `fetchPatrimonio()` pode falhar independentemente → já está em `.catch(() => null)` se adicionado ao Promise.all
- **[Trade-off]** Exibir R$0 de Bradesco pode poluir a UI → filtrar `saldo_atual > 0`
