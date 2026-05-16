## ADDED Requirements

### Requirement: View cube_patrimonio mostra saldo atual por conta e tipo
O sistema SHALL criar view `cube_patrimonio` sobre `d_conta` (que lê de `accounts`) com colunas: `account_id` (TEXT), `nome` (TEXT), `banco` (TEXT), `tipo` (TEXT), `subtipo` (TEXT), `dono` (TEXT), `saldo_atual` (NUMERIC, de `accounts.balance`), `limite_credito` (NUMERIC), `moeda` (TEXT). Inclui também linha de totais por tipo.

#### Scenario: Saldo total de contas bancárias
- **WHEN** `cube_patrimonio` é filtrada por `tipo = 'BANK'`
- **THEN** retorna uma linha por conta bancária com `saldo_atual` não-nulo

#### Scenario: Cartões aparecem com limite e saldo devedor
- **WHEN** `cube_patrimonio` é filtrada por `tipo = 'CREDIT'`
- **THEN** retorna uma linha por cartão com `limite_credito` não-nulo
