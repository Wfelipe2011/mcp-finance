## ADDED Requirements

### Requirement: Shell das abas SHALL seguir estratégia mobile-first
The system SHALL priorizar layout para viewport mobile e expandir progressivamente para tablet/desktop sem quebrar navegação ou leitura de conteúdo.

#### Scenario: Renderização base em viewport mobile
- **WHEN** a aplicação é renderizada em viewport mobile
- **THEN** cada aba usa fluxo de conteúdo em coluna única
- **AND** cards ocupam largura disponível sem overflow horizontal

#### Scenario: Expansão progressiva para desktop
- **WHEN** a aplicação é renderizada em viewport desktop
- **THEN** o layout pode aumentar densidade e distribuição de blocos
- **AND** mantém semântica e ordem de leitura equivalentes ao mobile

### Requirement: Navegação entre abas SHALL preservar estado visual consistente
The system SHALL manter consistência de alinhamento, espaçamento e hierarquia visual ao alternar entre Resumo, Gastos, Próx. Mês, Previsão, Investimentos e Insights.

#### Scenario: Alternância sequencial entre as 6 abas
- **WHEN** o usuário navega sequencialmente pelas 6 abas
- **THEN** não ocorre salto de layout que esconda conteúdo primário
- **AND** a hierarquia de títulos, KPIs e cards permanece legível
