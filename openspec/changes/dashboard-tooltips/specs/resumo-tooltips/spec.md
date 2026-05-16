## ADDED Requirements

### Requirement: Tooltip explicativo no Resultado do Mês
O sistema SHALL exibir um ícone de ajuda ao lado do label "Resultado do Mês" que, ao ser acionado (hover desktop / toque mobile), mostra o texto: "Receitas reais menos despesas reais do mês. Exclui transferências entre contas e aportes em investimentos."

#### Scenario: Tooltip aparece no hover
- **WHEN** o usuário passa o mouse sobre o ícone "?" ao lado de "Resultado do Mês"
- **THEN** um tooltip aparece com o texto explicativo da métrica

#### Scenario: Tooltip funciona em mobile
- **WHEN** o usuário toca no ícone "?" em dispositivo touch
- **THEN** o tooltip aparece e permanece visível até o próximo toque fora

### Requirement: Tooltip explicativo em Receitas
O sistema SHALL exibir um ícone de ajuda ao lado do label "Receitas" que, ao ser acionado, mostra o texto: "Total de entradas de dinheiro no mês (salários, rendimentos, etc.). Transferências entre suas contas não são contadas."

#### Scenario: Tooltip em Receitas aparece
- **WHEN** o usuário aciona o ícone "?" ao lado de "Receitas"
- **THEN** um tooltip aparece com o texto explicativo

### Requirement: Tooltip explicativo em Despesas
O sistema SHALL exibir um ícone de ajuda ao lado do label "Despesas" que, ao ser acionado, mostra o texto: "Total de saídas de dinheiro no mês (compras, contas, etc.). Transferências entre suas contas e aportes em investimentos não são contados."

#### Scenario: Tooltip em Despesas aparece
- **WHEN** o usuário aciona o ícone "?" ao lado de "Despesas"
- **THEN** um tooltip aparece com o texto explicativo

### Requirement: Tooltip explicativo no Fôlego Imediato
O sistema SHALL exibir um ícone de ajuda ao lado do label "Fôlego imediato:" que, ao ser acionado, mostra o texto: "Por quantos dias seu saldo em conta corrente/poupança sustenta seus gastos médios dos últimos 3 meses."

#### Scenario: Tooltip em Fôlego Imediato aparece
- **WHEN** o usuário aciona o ícone "?" ao lado de "Fôlego imediato:"
- **THEN** um tooltip aparece com o texto explicativo do cálculo

### Requirement: Tooltip explicativo no Fôlego Total
O sistema SHALL exibir um ícone de ajuda ao lado do label "Fôlego total:" que, ao ser acionado, mostra o texto: "Por quantos dias seu saldo em conta corrente/poupança mais seus investimentos sustentam seus gastos médios dos últimos 3 meses."

#### Scenario: Tooltip em Fôlego Total aparece
- **WHEN** o usuário aciona o ícone "?" ao lado de "Fôlego total:"
- **THEN** um tooltip aparece com o texto explicativo do cálculo

### Requirement: Ícone de ajuda discreto e consistente
O sistema SHALL usar um ícone padrão (estilo `HelpOutline` ou equivalente) com tamanho pequeno (≤ 16px) e cor secundária/desabilitada em todos os 5 tooltips, sem interferir no layout existente dos cards.

#### Scenario: Ícone não quebra layout
- **WHEN** o card de Resumo é renderizado com os tooltips
- **THEN** o layout dos números e labels permanece idêntico ao estado anterior, com o ícone posicionado inline ao lado do label
