## ADDED Requirements

### Requirement: Admin API retorna métricas de performance por worker
O endpoint `GET /api/admin/workers` SHALL retornar, para cada worker, quatro campos numéricos calculados a partir dos jobs concluídos: `avg_duration_7d_secs`, `median_duration_7d_secs`, `avg_duration_all_secs`, `median_duration_all_secs`. Quando não houver jobs concluídos na janela, o valor SHALL ser `null`.

#### Scenario: Worker com jobs concluídos nos últimos 7 dias
- **WHEN** `GET /api/admin/workers` é chamado e o worker tem jobs com `status='done'` e `finished_at` nos últimos 7 dias
- **THEN** `avg_duration_7d_secs` e `median_duration_7d_secs` retornam valores numéricos maiores que zero

#### Scenario: Worker sem jobs concluídos
- **WHEN** `GET /api/admin/workers` é chamado e o worker nunca processou um job
- **THEN** `avg_duration_7d_secs`, `median_duration_7d_secs`, `avg_duration_all_secs` e `median_duration_all_secs` retornam `null`

### Requirement: Admin panel exibe média e mediana na tabela de workers
O painel HTML SHALL exibir duas colunas adicionais na tabela de workers: **Média (7d)** e **Mediana (7d)**, formatadas como "X,Xs" ou "—" quando null.

#### Scenario: Renderização com dados disponíveis
- **WHEN** o admin panel carrega workers com `avg_duration_7d_secs = 3.2`
- **THEN** a célula exibe "3,2s"

#### Scenario: Renderização sem dados
- **WHEN** o admin panel carrega workers com `median_duration_7d_secs = null`
- **THEN** a célula exibe "—"

### Requirement: Admin panel exibe legenda explicando média vs mediana
O painel HTML SHALL exibir, abaixo da tabela de workers, uma legenda permanentemente visível explicando a diferença entre média e mediana em termos práticos para o contexto de processamento de jobs de IA.

#### Scenario: Legenda presente na página
- **WHEN** o admin panel carrega a seção de workers
- **THEN** uma legenda com explicação de média e mediana é visível abaixo da tabela, sem necessidade de interação do usuário

### Requirement: Admin panel auto-refresha workers a cada 30 segundos
O painel HTML SHALL atualizar automaticamente apenas a seção de workers a cada 30 segundos após o carregamento inicial, sem recarregar a página ou a seção de tenants.

#### Scenario: Auto-refresh ativo
- **WHEN** o usuário está autenticado e a seção de dados está visível
- **THEN** `loadWorkers()` é chamado automaticamente a cada 30 segundos
