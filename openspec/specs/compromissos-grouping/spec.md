## ADDED Requirements

### Requirement: Um compromisso por compra parcelada
O `cube_compromissos_ativos` deve retornar uma linha por compra parcelada em aberto, não uma por cobrança mensal.

#### Scenario: Compra parcelada em 10x com 4 parcelas pagas
- **WHEN** banco possui parcelas PARC01/10 a PARC04/10 para a mesma compra
- **THEN** view retorna 1 linha com `installment_atual=4`, `total_installments=10`, `compromisso_restante = 6 * amount`

#### Scenario: Compra quitada (todas as parcelas pagas)
- **WHEN** banco possui parcelas PARC10/10 para alguma compra
- **THEN** essa compra NÃO aparece em `cube_compromissos_ativos`

#### Scenario: Parcelas com descrições diferentes mas mesma compra
- **WHEN** Pluggy gera `"FATURA PARCELAPARC01/10"` e `"FATURA PARCELAPARC02/10"` para a mesma compra
- **THEN** view agrupa em 1 linha, não 2

### Requirement: Contagem total de compromissos reflete compras distintas
- **WHEN** banco possui ≈40-60 compras parceladas em aberto
- **THEN** `COUNT(*) FROM cube_compromissos_ativos` retorna 40-60, não 193
