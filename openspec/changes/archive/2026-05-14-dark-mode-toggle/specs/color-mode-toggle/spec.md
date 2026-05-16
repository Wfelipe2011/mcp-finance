## ADDED Requirements

### Requirement: Toggle manual entre modo claro e escuro
O app SHALL fornecer um botão de toggle no header que alterna entre `light` e `dark` mode. O ícone SHALL ser um sol (LightModeIcon) quando o modo atual é escuro, e uma lua (DarkModeIcon) quando o modo atual é claro.

#### Scenario: Usuário ativa modo escuro
- **WHEN** o app está em modo claro e o usuário toca o botão de toggle
- **THEN** o tema muda para dark mode em todos os componentes imediatamente

#### Scenario: Usuário ativa modo claro
- **WHEN** o app está em modo escuro e o usuário toca o botão de toggle
- **THEN** o tema muda para light mode em todos os componentes imediatamente

### Requirement: Persistência da preferência em localStorage
O app SHALL salvar a preferência de colorMode (`"light"` ou `"dark"`) no `localStorage` sob a chave `colorMode` sempre que o usuário fizer o toggle.

#### Scenario: Preferência salva após toggle
- **WHEN** o usuário troca o modo
- **THEN** `localStorage.getItem("colorMode")` retorna o novo valor

#### Scenario: Preferência restaurada ao reabrir
- **WHEN** o usuário fecha e reabre o app (nova sessão)
- **THEN** o app inicia no modo que estava ativo na última sessão

#### Scenario: Fallback para light sem preferência salva
- **WHEN** não há valor em `localStorage` para a chave `colorMode`
- **THEN** o app inicia em modo claro (light)

### Requirement: Todos os componentes respondem ao tema
O app SHALL garantir que todos os componentes visuais (fundo, texto, cards, gráficos, navegação) adaptem suas cores ao modo selecionado sem valores hardcoded.

#### Scenario: Fundo do app em dark mode
- **WHEN** o modo escuro está ativo
- **THEN** o fundo da tela usa `background.default` do tema MUI (não `bg-gray-50` do Tailwind)

#### Scenario: Cards com superfície correta em dark mode
- **WHEN** o modo escuro está ativo
- **THEN** cards que usavam `bgcolor: "grey.50"` exibem `background.paper` (cinza escuro)

#### Scenario: Card de resumo AI com toque azul em dark mode
- **WHEN** o modo escuro está ativo
- **THEN** o card da narrativa do digest exibe fundo com `alpha(primary.main, 0.12)` (azul translúcido visível sobre fundo escuro)
