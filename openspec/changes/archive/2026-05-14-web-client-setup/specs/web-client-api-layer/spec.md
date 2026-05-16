## ADDED Requirements

### Requirement: Hook useApi para fetch com estado gerenciado
O sistema SHALL prover hook `useApi<T>(url: string)` que retorna `{ data: T | null, loading: boolean, error: string | null }` e re-executa o fetch sempre que `url` muda.

#### Scenario: Estado loading durante fetch
- **WHEN** componente monta com useApi
- **THEN** `loading` é `true` até a resposta chegar

#### Scenario: Dados disponíveis após fetch bem-sucedido
- **WHEN** API retorna status 200 com JSON
- **THEN** `data` contém o JSON parseado e `loading` é `false`

#### Scenario: Erro capturado em caso de falha
- **WHEN** API retorna status 4xx/5xx ou falha de rede
- **THEN** `error` contém mensagem descritiva e `data` é `null`

#### Scenario: Refetch automático ao mudar URL
- **WHEN** `url` passado ao hook muda (ex: mês selecionado muda)
- **THEN** hook cancela fetch anterior (AbortController) e inicia novo fetch

### Requirement: Funções tipadas de API em client.ts
O sistema SHALL ter arquivo `client/src/api/client.ts` exportando funções nomeadas para cada endpoint, com tipos TypeScript definidos em `client/src/api/types.ts`.

#### Scenario: Função fetchCashflow tipada
- **WHEN** componente chama `fetchCashflow("2025-03")`
- **THEN** retorna `Promise<CashflowMensal | null>` com campos tipados corretamente

#### Scenario: Tipos numéricos garantidos
- **WHEN** API retorna campos monetários
- **THEN** tipos TypeScript definem esses campos como `number`, não `string`
