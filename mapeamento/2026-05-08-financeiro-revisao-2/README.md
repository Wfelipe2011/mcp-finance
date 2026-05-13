# Revisao 2 - Endpoints Financeiros Pluggy

Data: 2026-05-08
Projeto: mcp-finance
Modo: exploracao (sem implementacao)

## Objetivo

Revisar e ampliar o mapeamento para cobrir tudo que foi observado como fluxo financeiro no app Meu Pluggy.

## Escopo revisado

- Rotas navegadas:
  - /overview
  - /cash
  - /assets
  - /connections
  - /connections/{item_uuid}
- Coleta com instrumentacao em runtime (fetch/xhr).
- Foco em dados financeiros, transacoes e datasets de suporte financeiro.

## Arquivos desta pasta

1. endpoints-financeiro-revisado.json
   - Inventario consolidado dos endpoints financeiros observados
   - Shapes de request/response em nivel de contrato
   - Classificacao por categoria e criticidade para ingestao

2. cobertura-e-lacunas.md
   - O que foi coberto na revisao
   - O que aparece como capacidade financeira, mas nao foi observado em chamada HTTP
   - Riscos e proximos passos de investigacao

## Delta em relacao a rodada anterior

- Endpoint novo confirmado na revisao:
  - GET https://my-api.pluggy.ai/identity/?itemId={item_uuid}
- Confirmacao de fluxo financeiro por detalhe de conexao:
  - fan-out de /transactions?accountId=...
  - fan-out de /investments/{investment_uuid}/transactions
- Confirmacao de comportamento em /cash:
  - filtros visuais (Todos/Entradas/Saidas e conexao) seguem como filtro local (sem novas chamadas)

## Observacao de seguranca

Exemplos de payload/resposta foram saneados para evitar exposicao de dados pessoais e credenciais.
