## ADDED Requirements

### Requirement: Cards informacionais SHALL ter espaçamento interno mínimo padronizado
The system SHALL aplicar padding interno e espaçamento vertical consistentes em cards de KPI, resumo e listas de detalhe.

#### Scenario: Card de KPI com título, valor e descrição
- **WHEN** um card contém título, valor e texto de apoio
- **THEN** há separação visual suficiente entre esses blocos
- **AND** o card mantém respiração visual sem conteúdo colado nas bordas

#### Scenario: Card com múltiplas linhas de detalhe
- **WHEN** um card exibe múltiplas linhas (ex.: receitas/despesas/fôlego)
- **THEN** cada linha mantém espaçamento vertical uniforme
- **AND** os elementos não se sobrepõem em viewport mobile

### Requirement: Abas SHALL manter ritmo vertical consistente entre cards
The system SHALL manter gap vertical consistente entre cards para evitar densidade excessiva em mobile.

#### Scenario: Stack de cards na mesma aba
- **WHEN** uma aba exibe vários cards em sequência
- **THEN** os gaps entre cards são consistentes
- **AND** o início/fim de cada card é visualmente distinguível
