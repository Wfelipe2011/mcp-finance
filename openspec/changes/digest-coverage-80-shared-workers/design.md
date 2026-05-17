## Context

O pipeline atual tem três pontos independentes que liberam digest apenas com cobertura de enriquecimento em 100%: enqueue manual no admin, cron diário e validação no worker de digest. Isso gera inconsistência com a regra de produto definida agora (liberar digest com cobertura >= 80%).

Além disso, a execução de filas hoje é segmentada por tipo de worker (kind), enquanto a operação desejada é usar o mesmo conjunto de workers para consumir múltiplas filas, um job por vez por worker. Essa mudança é transversal porque impacta admin API, cron, worker loop, supervisor e observabilidade do pipeline.

Restrições relevantes:
- Manter compatibilidade com filas e tabelas já existentes.
- Evitar migração destrutiva de dados em workers e jobs.
- Preservar diagnósticos de fila no painel admin.

## Goals / Non-Goals

**Goals:**
- Unificar a régua de elegibilidade do digest para cobertura >= 80% em todos os gates.
- Garantir que o clique de enqueue digest reflita a nova regra de forma consistente.
- Implementar pool compartilhado de workers para enrich, digest e forecast, com processamento serial (um job por vez por worker).
- Definir estratégia determinística de seleção do próximo job para evitar starvation.
- Melhorar feedback operacional no admin quando o enqueue retornar 0 elegíveis.

**Non-Goals:**
- Reescrever o modelo de filas (manter tabelas atuais de enrich, digest e forecast).
- Alterar semântica de dados do digest (payload e schema de ai_monthly_digest permanecem).
- Migrar o pipeline de ml_training_jobs para o pool compartilhado nesta change.

## Decisions

### 1) Threshold único de digest em constante compartilhada
- Decisão: introduzir uma constante única de domínio para elegibilidade de digest (0.80) e reutilizar nos três pontos de gate: admin enqueue, digest cron e worker de digest.
- Racional: elimina divergência de regra entre entrada de fila e consumo do job.
- Alternativas consideradas:
  - Manter 100%: rejeitada por conflito com regra de produto.
  - Configurar via env var: adiada para evitar variação de ambiente sem necessidade imediata.

### 2) Worker pool compartilhado sem migração destrutiva de schema
- Decisão: manter tabela workers e filas existentes, mas alterar orquestração para que os workers ativos consumam múltiplas filas suportadas (enrich, digest, forecast) no mesmo loop.
- Racional: reduz risco de rollout e reaproveita observabilidade atual.
- Alternativas consideradas:
  - Remover coluna kind e redesenhar schema: rejeitada neste ciclo por alto custo de migração.
  - Manter workers segregados por kind: rejeitada por não atender decisão operacional.

### 3) Arbitragem de fila com fairness por rotação
- Decisão: usar rotação de prioridade por worker (round-robin entre tipos de fila) com fallback para próxima fila não vazia.
- Racional: evita fome de filas sem exigir query global complexa entre tabelas heterogêneas.
- Alternativas consideradas:
  - Prioridade fixa (digest > forecast > enrich): simples, mas pode provocar starvation em cenários de alta carga.
  - Menor created_at global via UNION: mais justo, porém aumenta complexidade e acoplamento SQL.

### 4) Feedback explícito no admin para enqueue digest
- Decisão: resposta de enqueue digest deve incluir elegíveis e critério aplicado, e a UI deve exibir mensagem explícita quando elegíveis = 0.
- Racional: remove percepção de falha silenciosa e reduz tempo de diagnóstico.
- Alternativas consideradas:
  - Apenas manter mensagem atual com contagem: rejeitada por pouca clareza operacional.

### 5) Compatibilidade operacional e rollout incremental
- Decisão: rollout em duas fases técnicas na mesma change: (1) threshold >= 80% em todos os gates; (2) pool compartilhado com arbitragem e métricas.
- Racional: permite validar rapidamente o ganho de disponibilidade de digest antes da mudança completa de consumo de filas.
- Alternativas consideradas:
  - Big-bang único: rejeitada por elevar risco de regressão em produção.

## Risks / Trade-offs

- [Risco] Divergência residual entre gates se algum ponto não for atualizado -> Mitigação: teste de integração cobrindo admin enqueue, cron e worker para o mesmo mês/tenant.
- [Risco] Starvation de fila em carga desigual -> Mitigação: rotação round-robin e métricas por fila para ajuste de política.
- [Risco] Regressão de throughput ao compartilhar workers -> Mitigação: monitorar tempo médio por tipo e ajustar número de workers ativos.
- [Risco] Expectativa de incluir ML training no mesmo pool -> Mitigação: explicitar não-escopo e abrir decisão futura específica para convergência do trainer Python.

## Migration Plan

1. Aplicar ajuste de threshold (>= 80%) em admin enqueue, digest cron e worker de digest.
2. Publicar mudanças de feedback no painel admin para tornar elegibilidade visível.
3. Introduzir loop de consumo compartilhado por worker com rotação entre filas.
4. Validar em ambiente de desenvolvimento com cenários de cobertura parcial (>=80 e <80).
5. Habilitar rollout com monitoramento de filas, erros e tempos médios.

Rollback:
- Reverter para estratégia atual de workers por tipo e gate 100% com rollback da release.
- Não há migração irreversível de dados nesta change.

## Open Questions

- A convergência de ml_training_jobs para o mesmo pool de workers deve ocorrer nesta trilha ou em change separada?
- A rotação round-robin deve ter pesos diferentes por fila (por exemplo, favorecer enrich em horário comercial)?
