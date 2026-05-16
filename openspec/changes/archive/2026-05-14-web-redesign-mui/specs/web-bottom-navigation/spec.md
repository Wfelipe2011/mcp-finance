## ADDED Requirements

### Requirement: BottomNavigation fixa substitui tabs horizontais
O sistema SHALL renderizar uma barra de navegação `BottomNavigation` do MUI Material fixada na base do viewport (`position: fixed; bottom: 0`), contendo os 5 destinos: Resumo, Gastos, Próximo Mês, Investimentos, Insights. O container de conteúdo principal SHALL ter `padding-bottom` suficiente para não ser sobreposto pela barra.

#### Scenario: Todas as abas visíveis no viewport mobile
- **WHEN** o app é renderizado em viewport de 390px de largura
- **THEN** todos os 5 ícones e labels de navegação são visíveis sem truncamento ou sobreposição

#### Scenario: Troca de aba ativa
- **WHEN** o usuário toca em um item da BottomNavigation
- **THEN** o conteúdo da aba correspondente é exibido e o item fica visualmente selecionado (cor primária MUI)

#### Scenario: Conteúdo não oculto pela barra
- **WHEN** o conteúdo de qualquer aba tem altura suficiente para rolar
- **THEN** o último elemento do conteúdo é acessível via scroll sem ser coberto pela BottomNavigation

### Requirement: Ícones semânticos por aba
Cada item da BottomNavigation SHALL ter um ícone MUI (`@mui/icons-material`) semanticamente relacionado à aba: Resumo=HomeRounded, Gastos=ReceiptLongRounded, Próximo Mês=CalendarMonthRounded, Investimentos=ShowChartRounded, Insights=AutoAwesomeRounded.

#### Scenario: Ícones renderizados
- **WHEN** a BottomNavigation é exibida
- **THEN** cada aba mostra seu ícone acima do label de texto
