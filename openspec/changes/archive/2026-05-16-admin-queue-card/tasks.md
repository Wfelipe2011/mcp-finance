## 1. Backend — getQueueStats no BunPgAdapter

- [x] 1.1 Adicionar interface `QueueStats` em `BunPgAdapter.ts` com os campos: `pending`, `running`, `done`, `error`, `total`, `error_rate_current`, `error_rate_historical`, `throughput_jobs_per_sec: number | null`, `eta_seconds: number | null`, `throughput_source: 'workers' | 'global' | 'unavailable'`
- [x] 1.2 Adicionar `getQueueStats(): Promise<QueueStats>` na interface e implementação de `enrich_jobs` no `BunPgAdapter.ts`:
  - Query 1: contagens por status com single GROUP BY
  - Query 2: mediana por worker ativo com histórico (JOIN workers + enrich_jobs done)
  - Query 3 (fallback): mediana global de todos os jobs done (quando Query 2 retorna vazio)
  - Calcular throughput combinado, taxas de erro e ETA em TypeScript

## 2. Backend — rota e handler

- [x] 2.1 Em `src/application/web/routes/admin/workers.ts`, adicionar `handleQueueStats(req, sql)`: chama `db.enrich_jobs.getQueueStats()` e retorna `jsonResponse(stats)`
- [x] 2.2 Em `src/application/web/router.ts`, adicionar rota: `if (path === "/api/admin/queue-stats" && req.method === "GET") return handleQueueStats(req, sql);`

## 3. Frontend — card HTML e estilos

- [x] 3.1 Em `panel.ts`, adicionar estilos CSS para o card (`.queue-card`, `.queue-grid`, `.queue-stat`, `.queue-label`, `.queue-value`, `.queue-sub`) no bloco `<style>`
- [x] 3.2 Em `panel.ts`, adicionar o HTML do card antes da tabela de workers na seção `#workers-section`, com placeholders que serão preenchidos pelo JS

## 4. Frontend — lógica JS

- [x] 4.1 Em `panel.ts`, implementar `formatEta(seconds)` que converte segundos em string legível: "menos de 1 minuto" / "Xmin" / "Xh Ymin" / "X dias Yh"
- [x] 4.2 Em `panel.ts`, implementar `loadQueueStats()`: fetch para `/api/admin/queue-stats`, preenche os campos do card; exibe "—" quando `null`
- [x] 4.3 Em `panel.ts`, chamar `loadQueueStats()` dentro de `loadAll()` em paralelo com `loadTenants()` e `loadWorkers()`
- [x] 4.4 Em `panel.ts`, adicionar `setInterval(() => loadQueueStats(), 30_000)` e limpar no logout

## 5. Validação

- [x] 5.1 Acessar `http://localhost:4001/admin` e confirmar que o card aparece acima da tabela de workers com contagens corretas
- [x] 5.2 Confirmar que o ETA é exibido (ou "—" com nota quando sem dados)
- [x] 5.3 Confirmar que ambas as taxas de erro aparecem em formato "X,X%"
- [x] 5.4 Aguardar 30 segundos e verificar que o card atualiza automaticamente
