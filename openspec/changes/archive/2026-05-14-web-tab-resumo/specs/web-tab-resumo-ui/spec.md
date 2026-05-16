## ADDED Requirements

### Requirement: Aba Resumo exibe resultado financeiro do mês
A aba Resumo SHALL exibir o `cashflow_real` do mês como número grande com cor semântica, `total_receitas` e `total_despesas` como métricas secundárias, e indicador de fôlego em meses.

#### Scenario: Cashflow negativo exibido em vermelho
- **WHEN** `cashflow_real` é negativo
- **THEN** valor é exibido em vermelho com sinal negativo

#### Scenario: Cashflow positivo exibido em verde
- **WHEN** `cashflow_real` é positivo
- **THEN** valor é exibido em verde

#### Scenario: Valores formatados como moeda brasileira
- **WHEN** campos monetários são exibidos
- **THEN** formato é `R$ 1.234,56` usando `Intl.NumberFormat` com locale `pt-BR`

#### Scenario: Estado de loading enquanto dados carregam
- **WHEN** chamadas de API estão em andamento
- **THEN** aba exibe componente LoadingCard em vez de dados parciais

#### Scenario: Estado de erro em falha de API
- **WHEN** qualquer chamada de API falha
- **THEN** aba exibe ErrorCard com mensagem descritiva

### Requirement: Flags da IA exibidas como badges
O sistema SHALL exibir as `flags` de `ai_monthly_digest` como badges coloridas com labels em português.

#### Scenario: Flags visíveis logo abaixo do cashflow
- **WHEN** digest tem flags
- **THEN** badges são exibidas imediatamente abaixo do número de cashflow

#### Scenario: Flag desconhecida exibida como está
- **WHEN** flag não está no dicionário de tradução
- **THEN** badge exibe a flag original (sem quebrar)

#### Scenario: Sem flags não exibe seção
- **WHEN** `flags` é null ou array vazio
- **THEN** seção de flags não é renderizada

### Requirement: Narrativa da IA exibida colapsável
O sistema SHALL exibir `narrative_pt` com os primeiros 200 caracteres visíveis e botão "ver mais" para expandir o texto completo.

#### Scenario: Narrativa curta exibida inteira
- **WHEN** `narrative_pt` tem menos de 200 caracteres
- **THEN** texto é exibido completo sem botão "ver mais"

#### Scenario: Narrativa longa tem accordion
- **WHEN** `narrative_pt` tem mais de 200 caracteres
- **THEN** exibe primeiros 200 chars + "..." + botão "ver mais ↓"

#### Scenario: Expandir narrativa mostra texto completo
- **WHEN** usuário clica em "ver mais"
- **THEN** texto completo é exibido e botão muda para "ver menos ↑"

#### Scenario: Digest null exibe mensagem placeholder
- **WHEN** `digest` é null para o mês selecionado
- **THEN** área da narrativa exibe "Análise de IA não disponível para este mês"

### Requirement: Indicador de fôlego com cor semântica
O sistema SHALL exibir `runway_meses` de `kpi_cash_runway` com cor que comunica urgência.

#### Scenario: Runway acima de 3 meses — verde
- **WHEN** `runway_meses` > 3
- **THEN** indicador exibido em verde (emerald)

#### Scenario: Runway entre 1 e 3 meses — amarelo
- **WHEN** 1 ≤ `runway_meses` ≤ 3
- **THEN** indicador exibido em âmbar

#### Scenario: Runway abaixo de 1 mês — vermelho
- **WHEN** `runway_meses` < 1
- **THEN** indicador exibido em vermelho com destaque
