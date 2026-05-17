## ADDED Requirements

### Requirement: Enqueue todos os meses históricos elegíveis

O endpoint `POST /api/admin/digest/enqueue` SHALL varrer todos os meses com transações disponíveis para cada tenant ativo e enfileirar os que possuem cobertura de enriquecimento ≥ 80% e ainda não têm digest job com status `done`, `pending` ou `running`.

#### Scenario: Meses históricos sem digest são enfileirados

- **WHEN** o endpoint é chamado sem body (ou com body vazio)
- **THEN** para cada tenant ativo, todos os `(year, month)` com cobertura ≥ 80% e sem job ativo/concluído são inseridos em `digest_jobs`
- **THEN** a resposta inclui `enqueued` com o total de jobs inseridos e `months` listando os pares `YYYY-MM` enfileirados

#### Scenario: Meses já com digest done não são duplicados

- **WHEN** o endpoint é chamado e um tenant já possui digest `done` para um mês com cobertura ≥ 80%
- **THEN** esse mês NÃO é inserido novamente em `digest_jobs`
- **THEN** `enqueued` não conta esse mês

#### Scenario: Meses com cobertura < 80% não são enfileirados

- **WHEN** um tenant possui transações em um mês mas cobertura < 80%
- **THEN** esse mês NÃO é inserido em `digest_jobs`

### Requirement: Enqueue de mês específico via parâmetro

O endpoint `POST /api/admin/digest/enqueue` SHALL aceitar parâmetro opcional `month` (formato `"YYYY-MM"`) no body. Quando fornecido, SHALL enfileirar apenas aquele mês para todos os tenants elegíveis, ignorando a varredura completa.

#### Scenario: Mês específico elegível é enfileirado

- **WHEN** o body contém `{ "month": "2026-02" }` e o tenant tem cobertura ≥ 80% nesse mês sem job ativo/concluído
- **THEN** apenas o job para `(2026, 2)` é inserido para aquele tenant
- **THEN** a resposta inclui `enqueued: 1` e `months: ["2026-02"]`

#### Scenario: Mês específico já processado não é duplicado

- **WHEN** o body contém `{ "month": "2026-05" }` e o tenant já tem digest `done` para esse mês
- **THEN** nenhum job é inserido
- **THEN** `enqueued: 0`
