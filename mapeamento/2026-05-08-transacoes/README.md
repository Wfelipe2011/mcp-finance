# Mapeamento de Movimentacao Monetaria (Pluggy)

Data: 2026-05-08
Metodo: chrome-devtools-mcp + instrumentacao fetch/xhr
Escopo: fluxo autenticado em /overview, /cash, /assets, /connections

## Arquivo principal

- endpoints-movimentacao.json

## Resultado curto

1. Endpoints centrais de movimentacao monetaria:
   - GET https://my-api.pluggy.ai/transactions?accountId={account_uuid}
   - GET https://my-api.pluggy.ai/investments/{investment_uuid}/transactions
2. Endpoints de suporte para montar o universo de contas/ativos:
   - GET https://my-api.pluggy.ai/items?only_my_items=true
   - GET https://my-api.pluggy.ai/accounts?itemId=...
   - GET https://my-api.pluggy.ai/investments?itemId=...
3. Endpoints de sessao/conector relevantes para pipeline MCP:
   - GET https://meu.pluggy.ai/api/access-token
   - POST https://meu.pluggy.ai/api/connect-token

## Observacao importante para seu banco MCP

- Em /cash, os filtros visuais (Todos, Entradas, Saidas) nao dispararam novas chamadas de rede durante os testes. A tela aparenta filtrar localmente os movimentos pre-carregados.
- O padrao real de coleta para movimentos foi fan-out por recurso:
  - para conta corrente/cartao: uma chamada por accountId
  - para investimentos: uma chamada por investmentId

## Proxima etapa sugerida para coleta automatizada

- Implementar crawler de coleta por lotes que:
  1. Busca itens (`/items?only_my_items=true`)
  2. Busca contas (`/accounts?itemId=...`) e investimentos (`/investments?itemId=...`)
  3. Executa fan-out em paralelo para:
     - `/transactions?accountId=...`
     - `/investments/{investmentId}/transactions`
  4. Normaliza e persiste em tabelas separadas: accounts_transactions, investments_transactions

Todos os exemplos neste pacote foram redigidos para evitar exposicao de credenciais e dados pessoais sensiveis.
