## 1. Tipos TypeScript

- [x] 1.1 Adicionar interface `DigestResponse` em `client/src/api/types.ts` com campos `status`, `data?` e `coverage?`

## 2. Cliente de API

- [x] 2.1 Atualizar `fetchDigest()` em `client/src/api/client.ts` para usar `get<DigestResponse>` e retornar `res.data ?? null` quando `status === 'ready'`, ou `null` caso contrário

## 3. Validação

- [x] 3.1 Rodar `cd client && bun run build` e confirmar zero erros de TypeScript
- [x] 3.2 Testar na UI com Wilson no mês 2026-05 e confirmar que a narrativa de IA aparece na aba Resumo
