## Context

O endpoint `GET /api/digest?month=YYYY-MM` retorna um envelope com dois possíveis formatos:

```json
// Digest gerado:
{ "status": "ready", "data": { "year": 2026, "month": 5, "narrative_pt": "...", ... } }

// Digest ainda não gerado:
{ "status": "pending", "coverage": 0.98 }
```

O frontend (`fetchDigest` em `client.ts`) usa `get<Digest>(url)` e trata a resposta diretamente como `Digest`. Como os campos de dados estão dentro de `data`, `digest.narrative_pt` resulta em `undefined` e o componente `DigestNarrative` exibe o fallback "Análise de IA não disponível".

O tipo `Digest` atual modela apenas os campos de dado, sem o envelope.

## Goals / Non-Goals

**Goals:**
- Exibir a narrativa de análise mensal de IA corretamente quando o digest está disponível
- Tratar o estado `pending` (digest ainda sendo gerado) com feedback visual adequado
- Modelar corretamente o envelope da resposta no tipo TypeScript

**Non-Goals:**
- Alterar o contrato da API (o envelope `{ status, data }` é mantido)
- Implementar polling automático enquanto status é `pending`
- Exibir `coverage` no estado pending (informação interna, não relevante pro usuário)

## Decisions

### D1 — Unwrap no cliente, não na API

**Decisão**: Corrigir o `fetchDigest()` no frontend para extrair `data` do envelope, retornando `Digest | null`.

**Alternativa considerada**: Alterar a API para retornar os dados diretamente sem envelope.

**Rationale**: A API usa o campo `status` de forma intencional para diferenciar `ready` vs `pending`. Remover o envelope quebraria esse contrato. O frontend é o lugar correto para adaptar a resposta ao modelo de dados esperado pelos componentes.

### D2 — Tipo `DigestResponse` separado do `Digest`

**Decisão**: Criar interface `DigestResponse` para o envelope e manter `Digest` para os dados:

```ts
export interface DigestResponse {
  status: 'ready' | 'pending';
  data?: Digest;
  coverage?: number;
}
```

`fetchDigest()` retorna `Digest | null` — `null` quando `status === 'pending'` ou erro.

**Rationale**: Evita vazamento do envelope para os componentes. Componentes só lidam com `Digest | null`, que já é o contrato atual.

### D3 — Estado pending no Resumo

**Decisão**: Quando `fetchDigest` retorna `null`, o componente `Resumo` passa `undefined` para `DigestNarrative`, que já exibe "Análise não disponível". Não é necessário diferenciar `pending` de `ausente` na UI por ora.

**Alternativa**: Expor o `status` como `'ready' | 'pending' | null` e mostrar mensagem específica "Análise sendo processada...".

**Rationale**: A mudança mínima resolve o bug sem adicionar complexidade. O estado pending é transitório e raramente visto pelo usuário.

## Risks / Trade-offs

- **[Risco]** O tipo `DigestResponse` não existia antes → breaking change nos tipos internos → **Mitigação**: apenas `fetchDigest` é afetado; nenhum outro consumer do tipo `Digest` precisa mudar
- **[Trade-off]** Estado `pending` é silencioso (mostra mesmo texto que "ausente") → usuário não sabe se está sendo processado → aceitável na versão inicial

## Migration Plan

Mudança puramente no frontend. Não há migração de dados nem de banco.

1. Atualizar `client/src/api/types.ts` — adicionar `DigestResponse`
2. Atualizar `client/src/api/client.ts` — `fetchDigest` faz unwrap
3. Rodar `cd client && bun run build` para validar TypeScript
4. Testar na UI com Wilson (maio/2026 deve exibir narrativa)
