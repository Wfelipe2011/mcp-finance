## Why

Hoje o botão de enqueue de digest pode aparentar “não fazer nada” porque a elegibilidade exige 100% de cobertura de enriquecimento, mesmo quando o mês já tem qualidade suficiente para análise. Além disso, a operação atual segmenta workers por tipo de fila, enquanto a decisão de produto passou a ser usar os mesmos workers para tudo, processando um job por vez.

## What Changes

- Redefinir a elegibilidade de digest para cobertura de enriquecimento maior ou igual a 80% no mês alvo.
- Alinhar a regra de elegibilidade em todos os pontos do pipeline (enqueue manual no admin, cron diário e validação no worker de digest).
- Migrar a orquestração para pool único de workers compartilhados entre filas de enrich, digest e forecast, com processamento serial (um job por vez por worker).
- Definir e documentar a estratégia de seleção do próximo job no worker compartilhado, incluindo desempate e fairness entre filas.
- Melhorar o feedback operacional no painel admin para deixar explícito quando houver 0 tenants elegíveis e qual a cobertura usada na decisão.
- Preservar rastreabilidade de execução (status, skips, erros e motivo de bloqueio) para diagnóstico rápido.

## Capabilities

### New Capabilities
- Nenhuma.

### Modified Capabilities
- `digest-gate`: alterar o gate de disponibilidade do digest de 100% para >= 80% de cobertura mensal por tenant.
- `admin-pipeline-queue-ui`: atualizar regra de enqueue do digest e mensagens de feedback para refletir o threshold de 80%.
- `digest-cron-process`: alterar o critério de enqueue automático diário para >= 80%.
- `digest-worker`: ajustar validação de cobertura no consumo do job para >= 80%.
- `worker-registry`: adaptar a execução para workers compartilhados entre múltiplas filas, com processamento sequencial por worker.

## Impact

- Backend de admin pipeline: endpoints de enqueue e payload de retorno.
- Processo de cron de digest e métricas de elegibilidade.
- Orquestração de workers/supervisor e estratégia de consumo de filas.
- Worker de digest e política de skip/erro.
- Contratos de observabilidade operacional (logs, contadores e diagnósticos no painel admin).
- Testes de integração do pipeline AI/ML para validar cobertura >= 80% e consumo por pool compartilhado.
