## Why

A análise de IA mensal (digest) está sendo gerada corretamente pelo pipeline e armazenada no banco, mas não aparece na interface para o usuário. O endpoint `/api/digest` envolve os dados em um envelope `{ status, data }`, enquanto o frontend trata a resposta como se os campos viessem no nível raiz — causando `narrative_pt === undefined` e exibindo "Análise de IA não disponível".

## What Changes

- Corrigir o tipo `Digest` no frontend para modelar o envelope de resposta da API corretamente
- Atualizar `fetchDigest()` em `client.ts` para extrair os dados do campo `data` antes de retornar
- Tratar o estado `pending` no componente `Resumo` (quando o digest ainda não foi gerado para o mês)
- Garantir que `DigestNarrative` exiba a narrativa quando disponível e estado de carregamento correto quando não

## Capabilities

### New Capabilities
- `digest-display`: Exibição correta da análise mensal de IA na aba Resumo, incluindo tratamento dos estados `ready`, `pending` e ausente

### Modified Capabilities
<!-- Nenhuma spec existente cobre o comportamento de exibição do digest -->

## Impact

- `client/src/api/types.ts` — tipo `Digest` e novo tipo para o envelope de resposta
- `client/src/api/client.ts` — função `fetchDigest()` com unwrap do envelope
- `client/src/tabs/Resumo.tsx` — tratamento de estado pending
- `client/src/components/DigestNarrative.tsx` — nenhuma alteração necessária (já trata `null`)
