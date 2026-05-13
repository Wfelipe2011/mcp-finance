# Cobertura e Lacunas - Revisao Financeira

## Cobertura confirmada

### 1) Movimentacao monetaria (cobertura forte)

- GET /transactions?accountId=...
- GET /investments/{investment_uuid}/transactions

Resultado:
- fluxo completo identificado para ingestao de debitos/creditos de conta
- fluxo completo identificado para movimentos de investimento (BUY/SELL, netAmount, movementType)

### 2) Contexto financeiro para enriquecer o banco

- GET /items?only_my_items=true
- GET /accounts?itemId=...
- GET /investments?itemId=...
- GET /identity/?itemId=...

Resultado:
- existe material suficiente para construir dimensoes de conta, investimento e titular
- item.products permite estrategia de coleta por capacidade

### 3) Sessao/conector

- GET /api/access-token
- POST /api/connect-token

Resultado:
- dependencia de sessao e onboarding mapeada para o pipeline MCP

## Mapa visual do fluxo financeiro observado

+------------------------------+
| GET /api/access-token        |
+--------------+---------------+
               |
               v
+------------------------------+
| GET /items?only_my_items=true|
+--------------+---------------+
               |
       +-------+-------+
       |               |
       v               v
+-------------+   +----------------+
| /accounts   |   | /investments    |
| ?itemId=... |   | ?itemId=...     |
+------+------+   +--------+--------+
       |                   |
       v                   v
+-------------------+  +------------------------------+
| /transactions     |  | /investments/{id}/transactions|
| ?accountId=...    |  +------------------------------+
+-------------------+

No detalhe da conexao:
- GET /identity/?itemId=... tambem e carregado.

## Lacunas desta rodada

1. Produtos financeiros sinalizados mas sem endpoint observado na captura:
   - LOANS
   - PAYMENT_DATA
   - BROKERAGE_NOTE

2. Acoes com efeito colateral nao exercitadas por seguranca:
   - botao Atualizar (possivel trigger de sync)
   - botao Excluir (remove conexao)

## Riscos de interpretacao

1. Endpoints nao observados podem existir e serem chamados apenas em condicoes especificas (feature flag, conta elegivel, estado da conexao, periodo).
2. Parte dos filtros da tela /cash funciona localmente; usar apenas navegacao visual pode dar falsa impressao de cobertura de API.

## Proximos passos de exploracao (sem implementar)

1. Rodada dedicada em conectores que tenham LOANS ativos para identificar endpoints reais de emprestimos.
2. Rodada dedicada para PAYMENT_DATA e BROKERAGE_NOTE, filtrando por itens com esses produtos realmente populados.
3. Captura de requests ao acionar Atualizar em ambiente de teste descartavel para descobrir endpoint de sincronizacao.
