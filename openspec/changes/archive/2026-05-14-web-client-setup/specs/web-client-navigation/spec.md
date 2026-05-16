## ADDED Requirements

### Requirement: TabGroup com 5 abas e MonthPicker funcional
O sistema SHALL renderizar uma interface com 5 abas (Resumo, Gastos, Próximo Mês, Investimentos, Insights) e um seletor de mês no header. O mês selecionado SHALL ser propagado para todas as abas como prop.

#### Scenario: 5 abas visíveis e navegáveis
- **WHEN** usuário abre o dashboard
- **THEN** são exibidas 5 abas: "Resumo", "Gastos", "Próximo Mês", "Investimentos", "Insights"

#### Scenario: Clicar em aba muda o conteúdo exibido
- **WHEN** usuário clica em uma aba diferente
- **THEN** conteúdo da aba anterior é desmontado e conteúdo da nova aba é exibido

#### Scenario: MonthPicker carrega meses da API
- **WHEN** dashboard carrega pela primeira vez
- **THEN** MonthPicker faz GET /api/meses e popula as opções com os meses disponíveis

#### Scenario: Mês mais recente selecionado por padrão
- **WHEN** API retorna lista de meses
- **THEN** primeiro item (mais recente) é selecionado automaticamente

#### Scenario: Mudança de mês atualiza todas as abas
- **WHEN** usuário seleciona mês diferente no MonthPicker
- **THEN** todas as abas que dependem do mês fazem refetch com o novo mês

#### Scenario: Layout mobile-first
- **WHEN** dashboard renderiza
- **THEN** container principal tem max-width limitado e centralizado, abas na parte inferior ou topo da viewport
