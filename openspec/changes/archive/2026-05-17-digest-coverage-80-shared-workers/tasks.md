## 1. Unificar gate de cobertura do digest (>= 80%)

- [x] 1.1 Criar constante compartilhada de cobertura mínima do digest (0.80) em módulo reutilizável do backend.
- [x] 1.2 Atualizar `POST /api/admin/digest/enqueue` para usar `coverage >= 0.80` e `total > 0` na elegibilidade por tenant.
- [x] 1.3 Atualizar `digest-cron.ts` para usar o mesmo critério de elegibilidade (`>= 0.80`) ao enfileirar jobs.
- [x] 1.4 Atualizar validação no worker de digest para aplicar o mesmo gate antes da geração e marcar `skipped` quando não elegível.
- [x] 1.5 Cobrir cenários de fronteira em testes (79%, 80%, 100% e mês sem transações).

## 2. Implementar pool compartilhado de workers (um job por vez)

- [x] 2.1 Implementar loop de worker compartilhado que tenta claim de `enrich_jobs`, `digest_jobs` e `forecast_jobs` no mesmo processo.
- [x] 2.2 Implementar política de rotação entre filas (round-robin com fallback para fila não vazia).
- [x] 2.3 Garantir que cada worker processe apenas um job por iteração e só então tente o próximo claim.
- [x] 2.4 Atualizar `supervisor.ts` para iniciar processo de worker compartilhado para cada worker ativo, sem segmentação rígida por tipo.
- [x] 2.5 Validar que auto-deactivação por crash (`error_count >= 5`) continua funcionando com o novo loop.

## 3. Ajustar feedback e diagnóstico no admin pipeline queue

- [x] 3.1 Atualizar resposta do enqueue digest para explicitar elegibilidade aplicada na nova régua.
- [x] 3.2 Atualizar mensagem do card de Digest Queue para deixar claro quando `eligible = 0` (sem parecer erro silencioso).
- [x] 3.3 Manter atualização dos contadores da fila após enqueue e preservar visibilidade de `skipped`.
- [x] 3.4 Adicionar/ajustar testes de endpoint admin para validar regra >= 80% e payload de retorno.

## 4. Verificação end-to-end e evidências

- [x] 4.1 Executar build do cliente (`cd client && bun run build`) para garantir integridade do frontend.
- [x] 4.2 Validar fluxo completo em ambiente local: enqueue manual, cron, consumo pelo worker compartilhado e persistência em `ai_monthly_digest`.
- [x] 4.3 Registrar evidências de execução (logs e estados de fila) para facilitar revisão e troubleshooting.
