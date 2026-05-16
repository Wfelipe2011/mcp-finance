## ADDED Requirements

### Requirement: Aba Insights exibe análise completa da IA
A aba Insights SHALL exibir a narrativa completa do digest, as despesas notáveis e as transações com anomalia detectada.

#### Scenario: Narrativa completa sem colapso
- **WHEN** digest tem `narrative_pt`
- **THEN** texto completo é exibido sem accordion (diferente da aba Resumo)

#### Scenario: Flags exibidas como pills no topo
- **WHEN** digest tem `flags`
- **THEN** FlagPills é exibido abaixo do título da aba

#### Scenario: Despesas notáveis com valor e razão
- **WHEN** digest tem `notable_expenses`
- **THEN** cada despesa é exibida com `description`, `amount` formatado em BRL e `reason`

#### Scenario: Anomalias filtradas por threshold
- **WHEN** transações do mês carregam com `anomaly_score > 0.6`
- **THEN** apenas essas transações são exibidas na seção "Anomalias detectadas"

#### Scenario: Barra de intensidade de anomalia
- **WHEN** transação com anomalia é exibida
- **THEN** uma barra visual indica intensidade (proporcional ao `anomaly_score` de 0 a 1)

#### Scenario: Digest null exibe instrução de geração
- **WHEN** digest não existe para o mês
- **THEN** mensagem informa "Análise de IA não disponível. Execute: bun run digest --month YYYY-MM"

#### Scenario: Sem anomalias exibe mensagem positiva
- **WHEN** nenhuma transação tem `anomaly_score > 0.6`
- **THEN** mensagem "Nenhuma anomalia detectada neste mês ✓"
