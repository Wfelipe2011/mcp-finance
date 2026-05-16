## ADDED Requirements

### Requirement: API expõe estatísticas da fila de enrich
O endpoint `GET /api/admin/queue-stats` (protegido por `requireSuperAdmin`) SHALL retornar um objeto JSON com os campos: `pending`, `running`, `done`, `error`, `total`, `error_rate_current`, `error_rate_historical`, `throughput_jobs_per_sec`, `eta_seconds`, `throughput_source`.

#### Scenario: Fila com jobs em múltiplos estados
- **WHEN** `GET /api/admin/queue-stats` é chamado com token válido de super admin
- **THEN** response retorna status 200 com contagens corretas para `pending`, `running`, `done`, `error` e `total = pending + running + done + error`

#### Scenario: Acesso sem autenticação
- **WHEN** `GET /api/admin/queue-stats` é chamado sem Bearer token
- **THEN** response retorna status 401

### Requirement: Throughput calculado a partir das medianas individuais dos workers
Quando workers ativos têm histórico de jobs concluídos, `throughput_jobs_per_sec` SHALL ser calculado como a soma de `1/median_secs` de cada worker ativo com histórico, e `throughput_source` SHALL ser `"workers"`.

#### Scenario: Dois workers com histórico
- **WHEN** worker A tem mediana 3s e worker B tem mediana 5s, ambos ativos
- **THEN** `throughput_jobs_per_sec ≈ 0.533` e `throughput_source = "workers"`

#### Scenario: Fallback para mediana global
- **WHEN** nenhum worker ativo tem histórico de jobs concluídos
- **THEN** `throughput_jobs_per_sec` é calculado como `N_workers_ativos / global_median_secs` e `throughput_source = "global"`

#### Scenario: Sem dados de performance
- **WHEN** não há jobs concluídos em nenhuma janela
- **THEN** `throughput_jobs_per_sec = null`, `eta_seconds = null`, `throughput_source = "unavailable"`

### Requirement: Taxa de erro em dois modos
A resposta SHALL incluir `error_rate_current` (jobs com status 'error' / total) e `error_rate_historical` (jobs com status 'error' / (done + error)).

#### Scenario: Fila com erros históricos
- **WHEN** há 12 jobs com status 'error' e 45 com status 'done'
- **THEN** `error_rate_historical ≈ 0.211` (12 / 57)
- **THEN** `error_rate_current = 12 / total`

### Requirement: Card "Caixa de Trabalhos" exibido no admin panel
O painel HTML SHALL exibir um card acima da tabela de workers com: contagens de pending/running/done/error, taxa de erro pontual e histórica em percentual, e ETA formatado em linguagem natural.

#### Scenario: Card com todos os dados disponíveis
- **WHEN** o admin panel carrega e `GET /api/admin/queue-stats` retorna dados completos
- **THEN** o card exibe as contagens, ambas as taxas de erro em formato "X,X%" e o ETA em formato legível (ex: "4h 23min")

#### Scenario: Card sem ETA disponível
- **WHEN** `throughput_source = "unavailable"`
- **THEN** o campo de ETA exibe "—" e uma nota indicando que aguarda dados de performance

### Requirement: Card auto-refresha a cada 30 segundos
O card SHALL ser atualizado automaticamente a cada 30 segundos enquanto o usuário está autenticado, sem recarregar a página ou a seção de tenants.

#### Scenario: Auto-refresh ativo após login
- **WHEN** o usuário está autenticado e a seção de dados está visível
- **THEN** `loadQueueStats()` é chamado a cada 30 segundos
- **THEN** o intervalo é limpo (clearInterval) ao fazer logout
