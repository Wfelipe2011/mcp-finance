## Context

A aba Insights crashava ao navegar para ela quando o digest de maio/2026 existia. O erro `TypeError: expenses.map is not a function` ocorre porque o campo `notable_expenses` retornado pela API é uma string `"[]"` em vez de um array `[]`.

Raiz: o modelo de IA (via LangChain `responseFormat`) às vezes retorna o campo JSONB já serializado como string. O `upsertDigest` então chama `JSON.stringify("[]")` produzindo `"\"[]\""` (double-encoded). Mesmo quando o modelo retorna uma string `"[]"` simples, ao persistir como JSONB o banco armazena o valor string — e ao ler, o Bun Postgres entrega uma string JS, não um array.

O mesmo problema afeta `structured_summary`, embora sem crash imediato (não há `.map()` sobre ele).

## Goals / Non-Goals

**Goals:**
- Eliminar o crash da aba Insights por `notable_expenses.map is not a function`
- Garantir que a leitura de campos JSONB (`notable_expenses`, `structured_summary`) seja sempre do tipo correto (array/object), independente do que foi gravado
- Prevenir double-encoding no `upsertDigest`
- Adicionar guard defensivo no componente React como camada final de proteção

**Non-Goals:**
- Migrar dados já persistidos no banco (a correção de leitura os cobre automaticamente)
- Mudar schema da API ou contrato REST
- Alterar o modelo de IA ou o agente `digestAgent.ts`

## Decisions

### D1 — Correção na leitura (BunPgAdapter)

**Decisão**: Fazer parse defensivo em `getDigestData` e `getDigestMensal`:
```ts
function parseJsonbField<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return value as T;
}
```

**Alternativa descartada**: corrigir apenas na origem (upsert) — não resolve dados já gravados incorretamente.

**Alternativa descartada**: corrigir apenas no front — mais frágil, deixa bug na API contract.

### D2 — Correção na escrita (upsertDigest)

**Decisão**: Antes de `JSON.stringify(data.notable_expenses)`, verificar se já é string e fazer parse. Padrão: sempre garantir que o valor é um objeto/array nativo antes de serializar:
```ts
const ne = typeof data.notable_expenses === 'string'
  ? JSON.parse(data.notable_expenses)
  : data.notable_expenses;
// então: JSON.stringify(ne)::jsonb
```

Mesmo tratamento para `structured_summary`.

### D3 — Guard defensivo no componente

**Decisão**: Em `NotableExpenses.tsx`, substituir `if (!expenses || expenses.length === 0)` por `if (!Array.isArray(expenses) || expenses.length === 0)`. Não muda comportamento para arrays válidos, mas impede crash para strings.

**Rationale**: Componente React não deve confiar cegamente que a prop é do tipo declarado no TypeScript — dados da API podem vir inesperados.

## Risks / Trade-offs

- **[Risco] `JSON.parse` de campo corrompido** → Mitigation: catch retorna `null`, componente renderiza estado vazio graciosamente.
- **[Trade-off] Helper de parse no BunPgAdapter** → Função utilitária pequena, local ao arquivo, sem overhead.
- **[Risco] `structured_summary` corrompido** → Mitigation: mesmo parse defensivo; nenhum consumer atual faz `.map()` sobre ele, mas o fix previne surpresas futuras.

## Migration Plan

1. Fazer as alterações em `BunPgAdapter.ts` (leitura + escrita)
2. Fazer o guard em `NotableExpenses.tsx`
3. Reiniciar a API (`bun run web:dev`)
4. Navegar para a aba Insights no browser — deve renderizar sem crash
5. Dados antigos já gravados como string são corrigidos automaticamente na leitura

Rollback: reverter os arquivos. Sem migração de banco necessária.
