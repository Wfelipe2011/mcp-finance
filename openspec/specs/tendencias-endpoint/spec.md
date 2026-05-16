## ADDED Requirements

### Requirement: View cube_tendencias com média 3 meses por grupo
O banco deve expor `cube_tendencias` calculando média, mínimo e máximo de gastos por grupo nos últimos 3 meses disponíveis no `cube_cashflow_mensal`.

#### Scenario: 3 meses de dados disponíveis
- **WHEN** `cube_cashflow_mensal` possui pelo menos 3 meses de dados
- **THEN** `cube_tendencias` retorna `media_mensal` por grupo baseada em exatamente 3 meses

#### Scenario: Menos de 3 meses disponíveis
- **WHEN** histórico possui menos de 3 meses
- **THEN** view retorna com base nos meses disponíveis e `meses_presentes` indica quantos foram usados

### Requirement: Endpoint GET /tendencias
A API deve expor um endpoint `/tendencias` sem parâmetro de mês, retornando `{ grupos: [...], recorrentes: [...] }`.

#### Scenario: Request a /tendencias
- **WHEN** GET /tendencias
- **THEN** resposta HTTP 200 com JSON `{ grupos: GrupoTendencia[], recorrentes: RecorrenteAI[] }`

### Requirement: Seção Tendências na aba Gastos
A aba Gastos deve exibir os dados de tendência abaixo das categorias existentes.

#### Scenario: Dados disponíveis
- **WHEN** `/tendencias` retorna grupos e recorrentes
- **THEN** app exibe "Média 3 meses por grupo" e "Recorrentes identificados" como painéis separados

#### Scenario: Recorrentes vazios (AI não executado)
- **WHEN** `recorrentes` array vazio
- **THEN** painel "Recorrentes" mostra mensagem "Execute o enriquecimento para ver dados de recorrência"
