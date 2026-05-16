## ADDED Requirements

### Requirement: Pipeline gera digest narrativo de mês completo
O sistema SHALL aceitar parâmetro `--month YYYY-MM`, ler os registros de `ai_transaction_insights` do mês correspondente via JOIN com `f_transacoes`, calcular métricas localmente (sem LLM), e invocar o modelo uma vez para gerar narrativa e estrutura JSON. O resultado SHALL ser persistido em `ai_monthly_digest` via UPSERT.

#### Scenario: Digest gerado com sucesso para mês com dados
- **WHEN** `bun run digest --month 2026-02` é executado e existem registros em `ai_transaction_insights` para fevereiro
- **THEN** uma linha é inserida ou atualizada em `ai_monthly_digest` com `year=2026`, `month=2`, `narrative_pt` não-nulo e `digest_at` atualizado

#### Scenario: UPSERT permite re-execução (idempotente)
- **WHEN** `bun run digest --month 2026-02` é executado duas vezes
- **THEN** a segunda execução atualiza o registro existente (não duplica)

### Requirement: Métricas financeiras são calculadas localmente, não pelo modelo
O sistema SHALL calcular `cashflow_real`, `debt_inflows` e `debt_payments` a partir dos dados já enriquecidos, sem delegar aritmética ao LLM. O modelo SHALL receber as métricas prontas e focar apenas em análise qualitativa.

#### Scenario: cashflow_real exclui entradas de dívida
- **WHEN** o digest de um mês com depósito de empréstimo é gerado
- **THEN** `cashflow_real` NÃO inclui transações onde `is_debt_related = true` e `type = 'INCOME'`

#### Scenario: debt_inflows captura empréstimos recebidos
- **WHEN** o mês contém transações com `is_debt_related = true` e `type = 'INCOME'`
- **THEN** `debt_inflows` é a soma positiva dessas transações

### Requirement: Script emite aviso quando enrichment_coverage é baixo
O sistema SHALL calcular `enrichment_coverage` como a razão entre transações com insight e total de transações do mês. Se `enrichment_coverage < 0.5`, SHALL emitir aviso no stdout antes de prosseguir.

#### Scenario: Aviso emitido com cobertura baixa
- **WHEN** apenas 30% das transações do mês têm registro em `ai_transaction_insights`
- **THEN** o script exibe "⚠ enrichment_coverage=30% — considere rodar `bun run enrich` antes"
- **THEN** o script continua e gera o digest com os dados disponíveis

#### Scenario: Sem aviso com cobertura suficiente
- **WHEN** 80% ou mais das transações do mês têm registro em `ai_transaction_insights`
- **THEN** nenhum aviso de cobertura é exibido

### Requirement: Parâmetro `--month` é obrigatório
O sistema SHALL encerrar com erro descritivo se `--month` não for fornecido.

#### Scenario: Execução sem --month retorna erro
- **WHEN** `bun run digest` é executado sem argumentos
- **THEN** o processo encerra com mensagem "Uso: bun run digest --month YYYY-MM"
