## MODIFIED Requirements

### Requirement: Persistência do filtro de mês
O filtro de mês SHALL persistir entre reloads do browser via `localStorage`.

#### Scenario: Mês salvo ao selecionar
- **WHEN** o usuário seleciona um mês no MonthPicker
- **THEN** o valor é salvo em `localStorage.getItem('selectedMonth')` imediatamente

#### Scenario: Mês restaurado ao abrir o app
- **WHEN** o usuário abre ou recarrega o app
- **AND** existe um valor em `localStorage['selectedMonth']`
- **THEN** o filtro de mês inicializa com esse valor salvo (não com o mês mais recente)

#### Scenario: Sem valor salvo comportamento padrão
- **WHEN** o usuário abre o app pela primeira vez (sem localStorage)
- **THEN** `selectedMonth` inicializa como `""` e MonthPicker exibe o mês mais recente (comportamento atual)
