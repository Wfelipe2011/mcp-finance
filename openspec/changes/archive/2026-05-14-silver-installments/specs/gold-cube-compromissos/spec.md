## ADDED Requirements

### Requirement: Cubo agrega parcelamentos ativos pela ótica da compra original
O cubo `cube_compromissos_ativos` SHALL agregar parcelamentos ativos por compra original, calculando o passivo futuro real de cada compra. A chave de agrupamento SHALL ser `(description, DATE(cc_purchase_date), amount, account_id)` para evitar overcounting causado por timestamps únicos por parcela emitidos pelo Pluggy.

Colunas obrigatórias:
- `cartao` (nome da conta de crédito)
- `dono` (owner_normalized)
- `category_pt`, `category_group_pt`
- `description`
- `data_compra` (DATE truncado de `cc_purchase_date`)
- `total_parcelas` (MAX de `cc_total_installments`)
- `ultima_parcela_registrada` (MAX de `cc_installment_number`)
- `parcelas_restantes` (`total_parcelas - ultima_parcela_registrada`)
- `valor_parcela` (`amount` — o valor por parcela)
- `compromisso_restante` (`parcelas_restantes * valor_parcela`)

#### Scenario: Compra com parcelas parcialmente sincronizadas mostra passivo correto
- **WHEN** uma compra de 12x R$130 tem parcelas 1 a 6 sincronizadas
- **THEN** `ultima_parcela_registrada = 6`, `parcelas_restantes = 6`, `compromisso_restante = R$780`

#### Scenario: Compra totalmente quitada não aparece no cubo
- **WHEN** `MAX(cc_installment_number) = MAX(cc_total_installments)`
- **THEN** a compra não aparece em `cube_compromissos_ativos` (`HAVING` filtra)

#### Scenario: Mesma compra com múltiplos timestamps é tratada como uma compra só
- **WHEN** parcelas 1-10 de uma compra têm `cc_purchase_date` com timestamps distintos por milissegundos mas mesmo dia
- **THEN** todas as parcelas são colapsadas em uma única linha via `DATE(cc_purchase_date)`

#### Scenario: Total do passivo por cartão é somável
- **WHEN** o cubo é consultado com `GROUP BY cartao`
- **THEN** a soma de `compromisso_restante` representa o passivo total futuro daquele cartão

### Requirement: Cubo inclui apenas parcelamentos com campos estruturados preenchidos
O cubo SHALL incluir apenas transações onde `cc_total_installments IS NOT NULL AND cc_purchase_date IS NOT NULL AND cc_total_installments > 1`. Transações com parcelamento inferido pela descrição (ex: "1/2" no texto) mas sem campos estruturados SHALL ser excluídas.

#### Scenario: Parcela com campo estruturado ausente não entra no cubo
- **WHEN** uma transação tem "1/2" na descrição mas `cc_total_installments IS NULL`
- **THEN** ela não aparece em `cube_compromissos_ativos`
