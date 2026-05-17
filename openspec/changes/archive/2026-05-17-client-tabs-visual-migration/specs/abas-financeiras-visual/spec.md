## MODIFIED Requirements

### Requirement: KPI de cashflow projetado em destaque na aba Previsão
O sistema SHALL exibir o cashflow projetado na aba Previsão com tipografia `number-display` e cor semântica via `amountToTone()`.

#### Scenario: Cashflow projetado positivo exibido em verde
- **GIVEN** que o cashflow projetado é positivo
- **WHEN** o usuário acessa a aba Previsão
- **THEN** o valor é exibido com `--color-trading-up` e tipografia `number-display`

### Requirement: KPI de patrimônio total em destaque na aba Investimentos
O sistema SHALL exibir o patrimônio total na aba Investimentos com tipografia `number-display`, destacado como o número principal da tela.

#### Scenario: Patrimônio total visível ao carregar a aba
- **WHEN** o usuário acessa a aba Investimentos
- **THEN** o patrimônio total é o elemento mais proeminente, com tipografia `number-display`

### Requirement: Layout de seções tokenizado nas abas Próx. Mês, Previsão e Investimentos
O sistema SHALL renderizar os layouts de seção, cards e KPIs secundários das 3 abas usando tokens de superfície, espaçamento, borda e tipografia do design system.

#### Scenario: Gráficos tokenizados integram corretamente
- **WHEN** as abas Previsão e Investimentos são renderizadas
- **THEN** `CashflowAreaChart`, `PatrimonioDonut` e `InvestimentosBarChart` aparecem sem erros visuais, integrados ao layout tokenizado das abas

### Requirement: Nenhuma cor hardcoded nas abas financeiras
O sistema SHALL renderizar as 3 abas sem nenhum valor hex de cor direto fora das variáveis CSS.

#### Scenario: Inspeção de código sem cores hardcoded
- **WHEN** os arquivos `ProximoMes.tsx`, `Previsao.tsx` e `Investimentos.tsx` são inspecionados
- **THEN** não existe nenhum valor hex de cor direto fora das variáveis CSS
