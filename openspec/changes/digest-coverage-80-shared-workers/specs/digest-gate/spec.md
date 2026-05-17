## ADDED Requirements

### Requirement: Gate de geração de digest usa cobertura mínima de 80%
A elegibilidade para geração de digest mensal SHALL usar a razão de cobertura `enriched / total` por tenant e mês, com critério `total > 0` e `coverage >= 0.80`.

#### Scenario: Tenant com cobertura acima de 80% fica elegível
- **WHEN** um tenant tem `total=88` e `enriched=87` no mês alvo
- **THEN** a cobertura calculada é considerada elegível para geração de digest

#### Scenario: Tenant com cobertura abaixo de 80% não fica elegível
- **WHEN** um tenant tem `total=100` e `enriched=79` no mês alvo
- **THEN** o tenant não é elegível para geração de digest

#### Scenario: Mês sem transações não é elegível
- **WHEN** um tenant tem `total=0` no mês alvo
- **THEN** o tenant não é elegível para geração de digest

### Requirement: Gate de cobertura deve ser consistente em todos os pontos de decisão
O sistema SHALL aplicar o mesmo critério (`coverage >= 0.80` e `total > 0`) no enqueue manual de digest, no cron de digest e na validação final do worker antes da geração.

#### Scenario: Enqueue manual e cron tomam a mesma decisão
- **WHEN** um tenant tem cobertura de 85% no mês alvo
- **THEN** o enqueue manual e o cron consideram o tenant elegível

#### Scenario: Worker aplica o mesmo gate antes de processar
- **WHEN** um job de digest é claimado para tenant com cobertura de 75%
- **THEN** o worker marca o job como skipped sem gerar digest
