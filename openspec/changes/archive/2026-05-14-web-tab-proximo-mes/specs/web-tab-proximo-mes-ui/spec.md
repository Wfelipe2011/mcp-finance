## ADDED Requirements

### Requirement: Aba Próximo Mês exibe cashflow projetado em AreaChart
A aba SHALL exibir `cube_cashflow_projetado` como AreaChart com distinção visual entre dados históricos e projetados.

#### Scenario: Série histórica e projetada em cores distintas
- **WHEN** dados de cashflow projetado carregam
- **THEN** meses com `is_projected=false` exibem série em cor primária (sólida)
- **THEN** meses com `is_projected=true` exibem série em cor secundária (diferente)

#### Scenario: Eixo X com nomes de mês legíveis
- **WHEN** chart renderiza
- **THEN** eixo X exibe `month_name_pt` (ex: "Maio", "Jun") em vez de data bruta

#### Scenario: Estado de loading durante fetch
- **WHEN** chamada está em andamento
- **THEN** aba exibe LoadingCard

### Requirement: Lista de compromissos ativos com progresso
A aba SHALL exibir `cube_compromissos_ativos` como lista com ProgressBar por compromisso e total mensal calculado.

#### Scenario: Cada compromisso exibe barra de progresso
- **WHEN** compromissos carregam
- **THEN** cada item exibe `<ProgressBar>` proporcional a `parcela_atual / total_parcelas`

#### Scenario: Label de progresso legível
- **WHEN** compromisso renderiza
- **THEN** label exibe "N/total parcelas" e "R$ X,XX/mês"

#### Scenario: Total comprometido calculado
- **WHEN** lista de compromissos renderiza
- **THEN** soma dos valores mensais é exibida como "Total comprometido: R$ X.XXX/mês"

#### Scenario: Lista longa colapsável
- **WHEN** mais de 5 compromissos existem
- **THEN** lista exibe 5 primeiros com botão "ver todos (N)"

#### Scenario: Sem compromissos exibe mensagem positiva
- **WHEN** `compromissos` é array vazio
- **THEN** exibe mensagem "Sem parcelas em aberto 🎉"

### Requirement: Runway reusado da aba Resumo
A aba SHALL exibir o `RunwayIndicator` no topo, reusando o componente criado em `web-tab-resumo`.

#### Scenario: RunwayIndicator no topo da aba
- **WHEN** aba renderiza com dados de runway
- **THEN** indicador de fôlego é exibido como primeiro elemento da aba
