## ADDED Requirements

### Requirement: Card de insights diários navegável
O sistema SHALL exibir um card de insights com navegação ◀▶ entre dias que possuem mensagem LLM gerada em `forecast_ai_messages`, adaptando o conteúdo exibido ao tipo de dia (passado, presente ou futuro).

#### Scenario: Navegação somente entre dias com mensagem LLM
- **WHEN** o usuário toca nas setas ◀▶
- **THEN** navega apenas entre datas presentes em `forecast_ai_messages` para o tenant, não entre todos os dias do calendário

#### Scenario: Dia presente (hoje)
- **WHEN** o dia selecionado é a data de hoje
- **THEN** exibe a mensagem LLM do dia, probabilidade geral de gasto, barra de progresso e lista de categorias prováveis com estimativas de valor

#### Scenario: Dia futuro
- **WHEN** o dia selecionado é posterior a hoje
- **THEN** exibe a mensagem LLM, probabilidade e estimativas de `forecast_daily_predictions`, com indicação visual de que é previsão futura

#### Scenario: Dia passado
- **WHEN** o dia selecionado é anterior a hoje
- **THEN** exibe a mensagem LLM gerada, e ao lado exibe o gasto real ocorrido (de `transactions_enriched`) vs o previsto, com desvio percentual

#### Scenario: Label do dia no cabeçalho do card
- **WHEN** qualquer dia é exibido
- **THEN** o cabeçalho mostra a data no formato `ddd DD mmm YYYY` (ex: "sáb 17 mai 2026") e as setas ficam desabilitadas quando não há dia anterior/próximo com mensagem

#### Scenario: Estado sem mensagens disponíveis
- **WHEN** nenhuma mensagem foi gerada ainda para o tenant
- **THEN** exibe estado vazio com instrução para ativar um modelo de treino diário
