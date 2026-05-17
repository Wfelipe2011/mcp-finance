## ADDED Requirements

### Requirement: Tabbar inferior SHALL permanecer fixa com área segura de conteúdo
The system SHALL manter a tabbar inferior fixa e garantir área segura inferior para que conteúdo rolável não fique coberto.

#### Scenario: Conteúdo final visível em listas e tabelas
- **WHEN** o usuário rola até o final de listas ou tabelas em qualquer aba
- **THEN** os últimos itens permanecem totalmente visíveis acima da tabbar fixa
- **AND** nenhuma linha final fica parcialmente coberta

#### Scenario: Conteúdo final visível em cards com gráficos
- **WHEN** o usuário visualiza cards de gráfico próximos ao fim da área rolável
- **THEN** eixos, labels e tooltips não ficam cobertos pela tabbar fixa

### Requirement: Superfícies flutuantes SHALL respeitar a tabbar fixa
The system SHALL posicionar elementos flutuantes de feedback/interação sem conflito visual com a tabbar fixa.

#### Scenario: Snackbar e feedback de ação
- **WHEN** uma mensagem de feedback é exibida no rodapé
- **THEN** ela aparece acima da tabbar fixa
- **AND** permanece totalmente legível
