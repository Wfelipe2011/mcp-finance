## ADDED Requirements

### Requirement: Aba Investimentos exibe patrimônio e evolução
A aba Investimentos SHALL exibir total de patrimônio, distribuição por tipo em DonutChart e evolução mensal em BarChart.

#### Scenario: Total patrimônio em destaque
- **WHEN** dados de patrimônio carregam
- **THEN** `total_patrimonio` é exibido como `<Metric>` no topo

#### Scenario: DonutChart por tipo de ativo
- **WHEN** DonutChart renderiza
- **THEN** fatias são agrupadas por `tipo` (ex: BANK, INVESTMENT) sem incluir contas CREDIT

#### Scenario: BarChart de evolução mensal
- **WHEN** dados de investimentos carregam
- **THEN** BarChart exibe rendimento por mês nos últimos 6 meses, ordenado cronologicamente

#### Scenario: Estado de loading durante fetch
- **WHEN** chamadas estão em andamento
- **THEN** aba exibe LoadingCard
