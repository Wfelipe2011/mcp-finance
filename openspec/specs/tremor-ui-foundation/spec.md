## ADDED Requirements

### Requirement: Shell do client SHALL usar Tremor + Tailwind sem dependência de runtime MUI
O sistema SHALL renderizar a shell principal (container, header, navegação inferior e cartões base) usando componentes Tremor e utilitários Tailwind, sem dependência de componentes MUI em runtime.

#### Scenario: Navegação principal funcional nas 6 abas
- **WHEN** o usuário abre a aplicação autenticada
- **THEN** os itens de navegação Resumo, Gastos, Próx. Mês, Previsão, Investimentos e Insights aparecem e alternam abas normalmente

#### Scenario: Renderização sem erro de biblioteca MUI
- **WHEN** a aplicação renderiza a shell após a migração
- **THEN** não ocorre erro de runtime relacionado a MUI no console do browser

### Requirement: Formulários e overlays SHALL manter comportamento atual com componentes não-MUI
O sistema SHALL preservar os fluxos de login, seleção de mês e configuração de usuário com componentes Tremor/Tailwind acessíveis.

#### Scenario: Login permanece funcional
- **WHEN** o usuário envia email e senha válidos na tela de login
- **THEN** o token é salvo e a aplicação navega para a área autenticada

#### Scenario: Edição de nome no diálogo de configurações permanece funcional
- **WHEN** o usuário altera o nome exibido e confirma salvamento
- **THEN** o nome é persistido e o estado de sucesso/erro é exibido visualmente

### Requirement: Client SHALL remover dependências MUI/Emotion ao final da migração
O sistema SHALL concluir a migração sem dependências `@mui/material`, `@mui/icons-material`, `@mui/x-charts`, `@emotion/react` e `@emotion/styled` no pacote do client.

#### Scenario: Dependências removidas no package do client
- **WHEN** o `client/package.json` é inspecionado após a migração
- **THEN** as dependências MUI e Emotion não estão presentes
