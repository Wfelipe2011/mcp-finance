## ADDED Requirements

### Requirement: Card de saldo em conta no Resumo
A aba Resumo SHALL exibir um card separado "Saldo em Conta" mostrando o saldo atual das contas bancárias (tipo BANK) do usuário, com breakdown individual por conta/dono.

#### Scenario: Contas com saldo exibidas
- **WHEN** o usuário abre a aba Resumo
- **THEN** o card "Saldo em Conta" exibe cada conta BANK com `saldo_atual > 0`, mostrando banco, dono e valor formatado em BRL

#### Scenario: Total consolidado visível
- **WHEN** o card é renderizado
- **THEN** o total consolidado de todas as contas BANK é exibido em destaque (typography h4 ou equivalente)

#### Scenario: Contas com saldo zero ocultadas
- **WHEN** uma conta BANK tem `saldo_atual = 0` (ex: Bradesco corrente)
- **THEN** essa conta NÃO aparece na lista (evitar poluição visual)

#### Scenario: Contas CREDIT não exibidas
- **WHEN** a resposta de /api/patrimonio contém itens com `tipo = 'CREDIT'`
- **THEN** esses itens NÃO aparecem no card de saldo (cartões ficam em Investimentos)

#### Scenario: Falha ao carregar patrimônio
- **WHEN** a chamada a /api/patrimonio falha
- **THEN** o card de saldo não é exibido (null) e o restante do Resumo funciona normalmente
