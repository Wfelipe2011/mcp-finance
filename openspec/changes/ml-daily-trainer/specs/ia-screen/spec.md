## ADDED Requirements

### Requirement: Tela IA dedicada com sub-abas no menu principal
O sistema SHALL substituir as entradas "Previsão" e "🧠 Treinar" no bottom navigation por um único item "IA" que abre uma tela dedicada com três sub-abas: Insights, Previsões e Treinar.

#### Scenario: Item IA no bottom nav
- **WHEN** o usuário visualiza o bottom navigation
- **THEN** vê 6 itens: Resumo · Gastos · Próx. Mês · Investimentos · [existentes] e o novo item "IA" com ícone adequado, substituindo "Previsão" e "🧠 Treinar"

#### Scenario: Abertura da tela IA
- **WHEN** o usuário toca no item "IA"
- **THEN** vê a tela `IaScreen` com três sub-abas: "Insights" · "Previsões" · "Treinar"

#### Scenario: Sub-aba Insights
- **WHEN** o usuário seleciona a sub-aba "Insights"
- **THEN** vê o card navegável de insights diários com setas ◀▶

#### Scenario: Sub-aba Previsões
- **WHEN** o usuário seleciona a sub-aba "Previsões"
- **THEN** vê o conteúdo atual da aba Previsão (forecast mensal com grupos, categorias e gráfico de barras)

#### Scenario: Sub-aba Treinar
- **WHEN** o usuário seleciona a sub-aba "Treinar"
- **THEN** vê a tela de gerenciamento do modelo diário: versões, categorias excluídas, conjunto de teste e botão de re-treinar

#### Scenario: Sem perda de funcionalidade existente
- **WHEN** o usuário acessa qualquer sub-aba
- **THEN** todas as funcionalidades previamente acessíveis em "Previsão" e "🧠 Treinar" continuam disponíveis sem alteração de comportamento
