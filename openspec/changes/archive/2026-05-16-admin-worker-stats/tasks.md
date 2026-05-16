## 1. Backend — enriquecer findAll() com métricas

- [x] 1.1 Em `src/infrastructure/db/BunPgAdapter.ts`, atualizar `WorkerRow` para incluir os campos: `avg_duration_7d_secs: number | null`, `median_duration_7d_secs: number | null`, `avg_duration_all_secs: number | null`, `median_duration_all_secs: number | null`
- [x] 1.2 Reescrever `workers.findAll()` para usar LEFT JOIN duplo com `enrich_jobs` e calcular os 4 aggregates (AVG + PERCENTILE_CONT 0.5) separados por janela 7d e all-time, conforme design.md

## 2. Frontend — tabela de workers

- [x] 2.1 Em `panel.ts`, adicionar 2 novas colunas no `<thead>` da tabela de workers: **Média (7d)** e **Mediana (7d)** (atualizar `colspan` de mensagens para corresponder)
- [x] 2.2 Em `renderWorkers()`, adicionar as células correspondentes para cada worker, formatando como "X,Xs" (1 casa decimal) ou "—" quando null

## 3. Frontend — legenda

- [x] 3.1 Em `panel.ts`, adicionar legenda abaixo da tabela de workers explicando a diferença entre média e mediana em termos de jobs de IA (ex: "Média: tempo total / nº de jobs. Mediana: tempo do job do meio — mais resistente a outliers como timeouts.")

## 4. Frontend — auto-refresh

- [x] 4.1 Em `panel.ts`, dentro de `showData()` ou após `loadAll()`, iniciar `setInterval(() => loadWorkers(), 30_000)` — garantir que o intervalo seja limpo (clearInterval) ao fazer logout

## 5. Validação

- [x] 5.1 Acessar `http://localhost:4001/admin` e confirmar que a tabela de workers exibe as colunas Média e Mediana com valores populados (ou "—" para workers sem histórico)
- [x] 5.2 Aguardar 30 segundos e confirmar que a tabela atualiza automaticamente (verificável pelos valores crescentes de jobs processados)
