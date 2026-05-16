# runway-format-display Specification

## Purpose
TBD - created by archiving change runway-format-display. Update Purpose after archive.
## Requirements
### Requirement: RunwayIndicator formata fôlego em dias quando menor que 30 dias
O sistema SHALL exibir o fôlego financeiro como "X dias" quando o valor convertido em dias totais for inferior a 30.

#### Scenario: Fôlego de menos de 1 mês exibe em dias
- **WHEN** `runway_meses` corresponde a menos de 30 dias (ex: 0.8 meses ≈ 24 dias)
- **THEN** o label do chip exibe "24 dias"
- **AND** a cor do chip é `error`

#### Scenario: Fôlego nulo exibe mensagem padrão
- **WHEN** `runway_meses` é `null`
- **THEN** o label exibe "Fôlego indisponível"
- **AND** a cor do chip é `default`

---

### Requirement: RunwayIndicator formata fôlego em meses e dias quando >= 30 dias
O sistema SHALL exibir o fôlego financeiro como "X meses e X dias" quando o valor convertido em dias totais for igual ou superior a 30. Se os dias restantes forem 0, omite a parte de dias.

#### Scenario: Fôlego de 2 meses e alguns dias
- **WHEN** `runway_meses` corresponde a 74 dias (ex: 2.43 meses)
- **THEN** o label exibe "2 meses e 14 dias"
- **AND** a cor do chip é `warning` (entre 30 e 89 dias)

#### Scenario: Fôlego de exatamente N meses (sem dias restantes)
- **WHEN** os dias calculados resultam em 0 dias de resto após divisão por 30
- **THEN** o label exibe "X meses" (sem "e 0 dias")

#### Scenario: Fôlego acima de 3 meses usa cor success
- **WHEN** `runway_meses` corresponde a >= 90 dias
- **THEN** a cor do chip é `success`

---

### Requirement: Thresholds de cor semântica usam dias como unidade
O sistema SHALL calcular a cor do chip de fôlego com base em dias totais, não em meses decimais:
- `>= 90 dias` → `success`
- `>= 30 dias` → `warning`
- `< 30 dias` → `error`
- `null` → `default`

#### Scenario: Threshold success em 90 dias
- **WHEN** `runway_meses` corresponde a exatamente 90 dias
- **THEN** cor é `success`

#### Scenario: Threshold error em 29 dias
- **WHEN** `runway_meses` corresponde a 29 dias
- **THEN** cor é `error`

