# Análise do Perfil Financeiro — Wilson
# Análise do Perfil Financeiro — Wilson
# Análise do Perfil Financeiro — Wilson

Data da análise: 2026-05-20

## Objetivo

Documentar, de forma teórica e reproduzível, como foi feita a análise do perfil financeiro do Wilson no banco de dados, incluindo:

- quais consultas foram usadas;
- quais raciocínios analíticos foram aplicados;
- quais números sustentam as conclusões;
- como essa lógica pode virar um serviço automatizado.

## Princípios da análise

1. Sempre analisar no contexto do tenant correto (`app.tenant_id`) para evitar mistura de dados.
2. Separar receita operacional de receita com empréstimo.
3. Não confiar apenas em média: usar média, mediana e versão sem outlier.
4. Explicar causa do problema com decomposição por blocos:
   - essenciais;
   - discricionários;
   - dívidas;
   - outros.
5. Transformar diagnóstico em plano de ação (ex.: 50/30/20 adaptado).

## Contexto técnico mínimo

```sql
-- Sempre iniciar sessão com tenant
SET app.tenant_id = '<TENANT_ID_WILSON>';
```

As consultas abaixo foram executadas usando o usuário `finance`, para simular o comportamento da aplicação (RLS ativo).

## Consultas SQL utilizadas

### 1) Série mensal de fluxo de caixa

Objetivo: obter receitas, despesas, empréstimos e saldo mês a mês.

```sql
SELECT
  year,
  month,
  total_receitas,
  total_receitas_operacionais,
  total_emprestimos,
  total_despesas,
  saldo_liquido
FROM cube_cashflow_mensal
ORDER BY year, month;
```

### 2) Estrutura da view de fluxo real

Objetivo: confirmar colunas disponíveis para segmentações.

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'f_fluxo_caixa'
ORDER BY ordinal_position;
```

### 3) Mapa de entradas por categoria

Objetivo: separar salário, empréstimo e demais entradas.

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  COALESCE(category_pt, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  ROUND(SUM(amount_signed)::numeric, 2) AS total
FROM f_fluxo_caixa
WHERE amount_signed > 0
GROUP BY 1, 2
ORDER BY total DESC;
```

### 4) KPIs médios dos últimos 12 meses fechados

Objetivo: custo médio, renda média, dependência de empréstimo e frequência de déficit.

```sql
WITH meses AS (
  SELECT
    make_date(year, month, 1) AS mes,
    total_receitas,
    total_receitas_operacionais,
    COALESCE(total_emprestimos, 0) AS total_emprestimos,
    total_despesas,
    saldo_liquido
  FROM cube_cashflow_mensal
),
recorte AS (
  SELECT *
  FROM meses
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  COUNT(*) AS meses_fechados,
  ROUND(AVG(total_despesas)::numeric, 2) AS custo_medio_mes,
  ROUND(AVG(total_receitas_operacionais)::numeric, 2) AS renda_operacional_media_mes,
  ROUND(AVG(total_receitas)::numeric, 2) AS renda_total_media_mes,
  ROUND(AVG(total_emprestimos)::numeric, 2) AS media_emprestimos_mes,
  ROUND(AVG(saldo_liquido)::numeric, 2) AS saldo_medio_mes,
  SUM(CASE WHEN saldo_liquido < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho,
  SUM(CASE WHEN (total_receitas_operacionais - total_despesas) < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho_sem_emprestimo,
  ROUND(AVG(total_receitas_operacionais - total_despesas)::numeric, 2) AS saldo_medio_sem_emprestimo
FROM recorte;
```

### 5) Evolução mensal detalhada (com e sem empréstimo)

Objetivo: identificar meses críticos e impacto do crédito.

```sql
WITH meses AS (
  SELECT
    make_date(year, month, 1) AS mes,
    total_receitas_operacionais,
    COALESCE(total_emprestimos, 0) AS total_emprestimos,
    total_despesas,
    saldo_liquido
  FROM cube_cashflow_mensal
),
recorte AS (
  SELECT *
  FROM meses
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  to_char(mes, 'YYYY-MM') AS mes,
  ROUND(total_receitas_operacionais::numeric, 2) AS receitas_sem_emprestimo,
  ROUND(total_emprestimos::numeric, 2) AS emprestimos,
  ROUND(total_despesas::numeric, 2) AS despesas,
  ROUND(saldo_liquido::numeric, 2) AS saldo,
  ROUND((total_receitas_operacionais - total_despesas)::numeric, 2) AS saldo_sem_emprestimo
FROM recorte
ORDER BY mes;
```

### 6) Média de salário (sem empréstimo)

Objetivo: calcular renda média salarial por duas óticas.

```sql
WITH salarios AS (
  SELECT
    date_trunc('month', date_day)::date AS mes,
    SUM(amount_signed) AS total_salario
  FROM f_fluxo_caixa
  WHERE amount_signed > 0
    AND category_pt = 'Salário'
  GROUP BY 1
),
recorte AS (
  SELECT *
  FROM salarios
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  COUNT(*) AS meses_com_salario,
  ROUND(SUM(total_salario)::numeric, 2) AS total_salarios_12m,
  ROUND(AVG(total_salario)::numeric, 2) AS media_mensal_nos_meses_com_salario,
  ROUND((SUM(total_salario) / 12.0)::numeric, 2) AS media_mensal_calendario_12m
FROM recorte;
```

### 7) Top saídas por categoria

Objetivo: descobrir alavancas de ajuste imediato.

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  COALESCE(category_pt, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  ROUND(SUM(ABS(amount_signed))::numeric, 2) AS total_saida
FROM f_fluxo_caixa
WHERE amount_signed < 0
  AND date_day >= date_trunc('month', current_date) - interval '12 months'
  AND date_day < date_trunc('month', current_date)
GROUP BY 1, 2
ORDER BY total_saida DESC;
```

### 8) Parcelamentos e compromissos futuros

Objetivo: medir pressão futura no caixa.

```sql
SELECT
  COUNT(*) AS qtd_parcelas_ativas,
  ROUND(SUM(compromisso_restante)::numeric, 2) AS saldo_parcelado_restante,
  ROUND(AVG(compromisso_restante)::numeric, 2) AS media_compromisso_por_compra
FROM cube_compromissos_ativos;
```

### 9) Decomposição em buckets (essenciais/discricionários/dívidas/outros)

Objetivo: base para a estratégia 50/30/20 adaptada.

```sql
WITH base AS (
  SELECT
    ABS(amount_signed) AS valor,
    category_group_pt,
    category_pt
  FROM f_fluxo_caixa
  WHERE amount_signed < 0
    AND date_day >= date_trunc('month', current_date) - interval '12 months'
    AND date_day < date_trunc('month', current_date)
),
bucket AS (
  SELECT
    CASE
      WHEN category_group_pt IN (
        'Moradia','Mercado e Supermercado','Serviços','Transporte','Saúde',
        'Obrigações Legais','Seguros','Tarifas Bancárias','Impostos'
      ) THEN 'essenciais'
      WHEN category_group_pt IN ('Compras','Alimentação','Serviços Digitais','Viagem','Doações')
        THEN 'discricionarios'
      WHEN category_group_pt = 'Empréstimos e Financiamentos'
        OR category_pt = 'Pagamento de fatura'
        THEN 'dividas'
      ELSE 'outros'
    END AS tipo,
    valor
  FROM base
)
SELECT
  tipo,
  ROUND(SUM(valor)::numeric, 2) AS total_12m,
  ROUND((SUM(valor) / 12.0)::numeric, 2) AS media_mes,
  ROUND((SUM(valor) * 100.0 / SUM(SUM(valor)) OVER ())::numeric, 2) AS pct_total
FROM bucket
GROUP BY tipo
ORDER BY total_12m DESC;
```

### 10) Runway de caixa (urgência)

Objetivo: medir quanto tempo o caixa atual sustenta as saídas.

```sql
SELECT
  ROUND(saldo_liquido::numeric, 2) AS saldo_liquido,
  ROUND(media_saidas_90d::numeric, 2) AS media_saidas_90d,
  ROUND(runway_imediato_meses::numeric, 2) AS runway_imediato_meses,
  ROUND((runway_imediato_meses * 30)::numeric, 0) AS runway_imediato_dias
FROM kpi_runway_imediato;

SELECT
  ROUND(saldo_liquido::numeric, 2) AS saldo_liquido,
  ROUND(saldo_investimentos::numeric, 2) AS saldo_investimentos,
  ROUND(media_saidas_90d::numeric, 2) AS media_saidas_90d,
  ROUND(runway_total_meses::numeric, 2) AS runway_total_meses,
  ROUND((runway_total_meses * 30)::numeric, 0) AS runway_total_dias
FROM kpi_runway_total;
```

## Números principais (resultado da execução)

### Tabela 1 — Resumo de indicadores

| Indicador | Valor |
|---|---:|
| Custo médio mensal (12m) | R$ 17.095,78 |
| Custo mediano mensal (12m) | R$ 14.815,06 |
| Custo médio sem fev/2026 (outlier) | R$ 12.848,61 |
| Receita operacional média (12m) | R$ 22.584,45 |
| Receita operacional média sem fev/2026 | R$ 16.638,89 |
| Média mensal de empréstimos recebidos | R$ 807,70 |
| Saldo médio mensal | R$ 6.296,37 |
| Meses no vermelho (12m) | 5 |
| Meses no vermelho sem entrada de empréstimo | 6 |

### Tabela 2 — Renda salarial (sem empréstimos)

| Métrica | Valor |
|---|---:|
| Total de salários em 12m | R$ 90.401,82 |
| Meses com salário | 8 |
| Média nos meses com salário | R$ 11.300,23 |
| Média mensal calendário (12m) | R$ 7.533,49 |
| Mediana de salário (meses com salário) | R$ 9.735,87 |

### Tabela 3 — Estrutura de saídas (12m)

| Bucket | Total 12m | Média/mês | % do total |
|---|---:|---:|---:|
| Essenciais | R$ 77.121,33 | R$ 6.426,78 | 37,54% |
| Discricionários | R$ 57.266,96 | R$ 4.772,25 | 27,88% |
| Dívidas | R$ 51.070,09 | R$ 4.255,84 | 24,86% |
| Outros | R$ 19.976,67 | R$ 1.664,72 | 9,72% |

### Tabela 4 — Pressão de crédito e liquidez

| Indicador | Valor |
|---|---:|
| Saídas totais (12m) | R$ 205.435,05 |
| Saídas com dívidas (12m) | R$ 47.599,08 |
| Saídas com dívidas (% do total) | 23,17% |
| Parcelamentos ativos (qtd) | 12 |
| Saldo parcelado restante | R$ 6.199,51 |
| Runway imediato | 12 dias |
| Runway total (caixa + investimentos) | 18 dias |

## Teoria do raciocínio analítico aplicado

### Etapa A — Medir o problema sem viés

Foi usada uma combinação de indicadores para reduzir distorções:

- média (visão geral);
- mediana (valor típico);
- média sem outlier (estabilidade);
- frequência de meses negativos.

Justificativa: apenas média pode mascarar instabilidade de renda e choques pontuais.

### Etapa B — Separar causa operacional de causa financeira

Separação central:

- resultado com empréstimos;
- resultado sem empréstimos;
- renda salarial vs renda total;
- peso mensal de dívidas.

Justificativa: evita interpretar entrada de crédito como melhora estrutural de renda.

### Etapa C — Decompor gasto em blocos acionáveis

As saídas foram classificadas em 4 buckets para suportar decisão:

1. essenciais;
2. discricionários;
3. dívidas;
4. outros.

Justificativa: diagnóstico útil precisa apontar exatamente "onde agir" e "quanto cortar/renegociar".

### Etapa D — Traduzir diagnóstico em plano (50/30/20 adaptado)

Regra teórica aplicada:

- 50% necessidades;
- 30% desejos;
- 20% objetivos financeiros (reserva + amortização).

Adaptação necessária quando há pressão de dívida:

- no curto prazo, priorizar redução de dívidas e discricionários;
- só depois convergir para 50/30/20 clássico.

## Como transformar essa teoria em serviço

### Pipeline sugerido

1. Input: tenant + janela temporal.
2. Extração: consultas SQL padronizadas (como acima).
3. Processamento:
   - KPIs de renda/custo/saldo;
   - detecção de outlier;
   - cálculo de buckets;
   - cálculo de dependência de crédito;
   - cálculo de runway.
4. Motor de diagnóstico:
   - regras de alerta (ex.: dívida > 20% da saída);
   - regras de risco (runway < 30 dias);
   - regras de recomendação (corte mínimo por bucket).
5. Output:
   - resumo executivo;
   - tabela de metas 50/30/20 adaptada;
   - plano de ação de 30/60/90 dias.

### Regras de inferência (teoria)

- Se `media_salario_calendario < essenciais + dividas`, existe risco estrutural de caixa.
- Se `dividas_pct > 20%`, prioridade é desalavancagem.
- Se `discricionarios_pct > 30%`, há espaço de ajuste de comportamento.
- Se `runway_imediato_dias < 30`, situação de urgência financeira.

## Análise de pequenas mudanças e prazo para chegar no 50/30/20

### Premissas usadas nesta projeção

- Janela: últimos 12 meses fechados, com leitura principal sem outlier de fev/2026.
- Renda base usada para projeção: R$ 16.638,89 (média operacional sem fev/2026).
- Volatilidade de renda relevante: coeficiente de variação de 66,81%.

### Estado atual (base sem fev/2026)

| Bloco | Valor mensal médio | % da renda base |
|---|---:|---:|
| Necessidades | R$ 6.219,82 | 37,38% |
| Desejos | R$ 4.135,52 | 24,85% |
| Objetivos/dívidas | R$ 1.232,91 | 7,41% |
| Outros | R$ 1.286,33 | 7,73% |
| Sobra de caixa | R$ 3.764,31 | 22,62% |

Leitura teórica: na média, necessidades e desejos já estão dentro de 50/30. O ponto crítico é transformar parte da sobra em objetivo financeiro recorrente (reserva + amortização), para fechar os 20% com consistência.

### Mudanças pequenas sugeridas (baixo atrito)

1. Reduzir desejos em R$ 800/mês (principalmente compras, restaurantes e delivery).
2. Reduzir necessidades em R$ 200/mês (telecom, energia, pequenos contratos de serviços).
3. Reduzir outros em R$ 300/mês (revisão de transferências e saídas sem categoria).
4. Direcionar +R$ 1.000/mês para objetivos financeiros.

### Cenário simulado com mudanças pequenas

| Bloco | Valor mensal simulado | % da renda base |
|---|---:|---:|
| Necessidades | R$ 6.019,82 | 36,18% |
| Desejos | R$ 3.335,52 | 20,05% |
| Objetivos/dívidas | R$ 2.232,91 | 13,42% |
| Outros | R$ 986,33 | 5,93% |
| Sobra de caixa | R$ 4.064,31 | 24,43% |

Para bater 20% de objetivos na renda base (R$ 3.327,78/mês), faltam R$ 1.094,87 além do bloco de objetivos/dívidas do cenário.

Como a sobra simulada é de R$ 4.064,31/mês, basta reservar automaticamente R$ 1.100/mês dessa sobra para fechar 50/30/20.

### Estimativa de prazo para atingir 50/30/20

1. Em média mensal: 1 mês.
2. Com consistência (3 ciclos seguidos): 2 a 3 meses.
3. Com proteção contra meses fracos de renda: 4 a 6 meses (tempo para formar colchão e reduzir recaída).

### Leitura conservadora (somente salário)

Quando a análise considera apenas salário:

- salário médio (meses com salário, sem fev/2026): R$ 11.914,23;
- despesa média nesses meses: R$ 14.913,83;
- gap médio: -R$ 2.999,60/mês;
- teto de despesa para sobrar 20% do salário: R$ 9.531,39.

Conclusão teórica: com salário isolado, 50/30/20 não fecha com pequenas mudanças; depende de combinação de redução maior de despesa e/ou aumento de renda recorrente.

## Observações

- Esta análise é metodológica e financeira (não é recomendação de investimento).
- A qualidade do diagnóstico depende da qualidade da categorização das transações.
- Para produção, é ideal registrar versão de regra analítica e data de cálculo para auditabilidade.
# Análise do Perfil Financeiro — Wilson

Data da análise: 2026-05-20

## Objetivo

Documentar, de forma teórica e reproduzível, como foi feita a análise do perfil financeiro do Wilson no banco de dados, incluindo:

- quais consultas foram usadas;
- quais raciocínios analíticos foram aplicados;
- quais números sustentam as conclusões;
- como essa lógica pode virar um serviço automatizado.

## Princípios da análise

1. Sempre analisar no contexto do tenant correto (`app.tenant_id`) para evitar mistura de dados.
2. Separar receita operacional de receita com empréstimo.
3. Não confiar apenas em média: usar média, mediana e versão sem outlier.
4. Explicar causa do problema com decomposição por blocos:
   - essenciais;
   - discricionários;
   - dívidas;
   - outros.
5. Transformar diagnóstico em plano de ação (ex.: 50/30/20 adaptado).

## Contexto técnico mínimo

```sql
-- Sempre iniciar sessão com tenant
SET app.tenant_id = '<TENANT_ID_WILSON>';
```

As consultas abaixo foram executadas usando o usuário `finance`, para simular o comportamento da aplicação (RLS ativo).

## Consultas SQL utilizadas

### 1) Série mensal de fluxo de caixa

Objetivo: obter receitas, despesas, empréstimos e saldo mês a mês.

```sql
SELECT
  year,
  month,
  total_receitas,
  total_receitas_operacionais,
  total_emprestimos,
  total_despesas,
  saldo_liquido
FROM cube_cashflow_mensal
ORDER BY year, month;
```

### 2) Estrutura da view de fluxo real

Objetivo: confirmar colunas disponíveis para segmentações.

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'f_fluxo_caixa'
ORDER BY ordinal_position;
```

### 3) Mapa de entradas por categoria

Objetivo: separar salário, empréstimo e demais entradas.

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  COALESCE(category_pt, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  ROUND(SUM(amount_signed)::numeric, 2) AS total
FROM f_fluxo_caixa
WHERE amount_signed > 0
GROUP BY 1, 2
ORDER BY total DESC;
```

### 4) KPIs médios dos últimos 12 meses fechados

Objetivo: custo médio, renda média, dependência de empréstimo e frequência de déficit.

```sql
WITH meses AS (
  SELECT
    make_date(year, month, 1) AS mes,
    total_receitas,
    total_receitas_operacionais,
    COALESCE(total_emprestimos, 0) AS total_emprestimos,
    total_despesas,
    saldo_liquido
  FROM cube_cashflow_mensal
),
recorte AS (
  SELECT *
  FROM meses
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  COUNT(*) AS meses_fechados,
  ROUND(AVG(total_despesas)::numeric, 2) AS custo_medio_mes,
  ROUND(AVG(total_receitas_operacionais)::numeric, 2) AS renda_operacional_media_mes,
  ROUND(AVG(total_receitas)::numeric, 2) AS renda_total_media_mes,
  ROUND(AVG(total_emprestimos)::numeric, 2) AS media_emprestimos_mes,
  ROUND(AVG(saldo_liquido)::numeric, 2) AS saldo_medio_mes,
  SUM(CASE WHEN saldo_liquido < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho,
  SUM(CASE WHEN (total_receitas_operacionais - total_despesas) < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho_sem_emprestimo,
  ROUND(AVG(total_receitas_operacionais - total_despesas)::numeric, 2) AS saldo_medio_sem_emprestimo
FROM recorte;
```

### 5) Evolução mensal detalhada (com e sem empréstimo)

Objetivo: identificar meses críticos e impacto do crédito.

```sql
WITH meses AS (
  SELECT
    make_date(year, month, 1) AS mes,
    total_receitas_operacionais,
    COALESCE(total_emprestimos, 0) AS total_emprestimos,
    total_despesas,
    saldo_liquido
  FROM cube_cashflow_mensal
),
recorte AS (
  SELECT *
  FROM meses
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  to_char(mes, 'YYYY-MM') AS mes,
  ROUND(total_receitas_operacionais::numeric, 2) AS receitas_sem_emprestimo,
  ROUND(total_emprestimos::numeric, 2) AS emprestimos,
  ROUND(total_despesas::numeric, 2) AS despesas,
  ROUND(saldo_liquido::numeric, 2) AS saldo,
  ROUND((total_receitas_operacionais - total_despesas)::numeric, 2) AS saldo_sem_emprestimo
FROM recorte
ORDER BY mes;
```

### 6) Média de salário (sem empréstimo)

Objetivo: calcular renda média salarial por duas óticas.

```sql
WITH salarios AS (
  SELECT
    date_trunc('month', date_day)::date AS mes,
    SUM(amount_signed) AS total_salario
  FROM f_fluxo_caixa
  WHERE amount_signed > 0
    AND category_pt = 'Salário'
  GROUP BY 1
),
recorte AS (
  SELECT *
  FROM salarios
  WHERE mes >= date_trunc('month', current_date) - interval '12 months'
    AND mes < date_trunc('month', current_date)
)
SELECT
  COUNT(*) AS meses_com_salario,
  ROUND(SUM(total_salario)::numeric, 2) AS total_salarios_12m,
  ROUND(AVG(total_salario)::numeric, 2) AS media_mensal_nos_meses_com_salario,
  ROUND((SUM(total_salario) / 12.0)::numeric, 2) AS media_mensal_calendario_12m
FROM recorte;
```

### 7) Top saídas por categoria

Objetivo: descobrir alavancas de ajuste imediato.

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  COALESCE(category_pt, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  ROUND(SUM(ABS(amount_signed))::numeric, 2) AS total_saida
FROM f_fluxo_caixa
WHERE amount_signed < 0
  AND date_day >= date_trunc('month', current_date) - interval '12 months'
  AND date_day < date_trunc('month', current_date)
GROUP BY 1, 2
ORDER BY total_saida DESC;
```

### 8) Parcelamentos e compromissos futuros

Objetivo: medir pressão futura no caixa.

```sql
SELECT
  COUNT(*) AS qtd_parcelas_ativas,
  ROUND(SUM(compromisso_restante)::numeric, 2) AS saldo_parcelado_restante,
  ROUND(AVG(compromisso_restante)::numeric, 2) AS media_compromisso_por_compra
FROM cube_compromissos_ativos;
```

### 9) Decomposição em buckets (essenciais/discricionários/dívidas/outros)

Objetivo: base para a estratégia 50/30/20 adaptada.

```sql
WITH base AS (
  SELECT
    ABS(amount_signed) AS valor,
    category_group_pt,
    category_pt
  FROM f_fluxo_caixa
  WHERE amount_signed < 0
    AND date_day >= date_trunc('month', current_date) - interval '12 months'
    AND date_day < date_trunc('month', current_date)
),
bucket AS (
  SELECT
    CASE
      WHEN category_group_pt IN (
        'Moradia','Mercado e Supermercado','Serviços','Transporte','Saúde',
        'Obrigações Legais','Seguros','Tarifas Bancárias','Impostos'
      ) THEN 'essenciais'
      WHEN category_group_pt IN ('Compras','Alimentação','Serviços Digitais','Viagem','Doações')
        THEN 'discricionarios'
      WHEN category_group_pt = 'Empréstimos e Financiamentos'
        OR category_pt = 'Pagamento de fatura'
        THEN 'dividas'
      ELSE 'outros'
    END AS tipo,
    valor
  FROM base
)
SELECT
  tipo,
  ROUND(SUM(valor)::numeric, 2) AS total_12m,
  ROUND((SUM(valor) / 12.0)::numeric, 2) AS media_mes,
  ROUND((SUM(valor) * 100.0 / SUM(SUM(valor)) OVER ())::numeric, 2) AS pct_total
FROM bucket
GROUP BY tipo
ORDER BY total_12m DESC;
```

### 10) Runway de caixa (urgência)

Objetivo: medir quanto tempo o caixa atual sustenta as saídas.

```sql
SELECT
  ROUND(saldo_liquido::numeric, 2) AS saldo_liquido,
  ROUND(media_saidas_90d::numeric, 2) AS media_saidas_90d,
  ROUND(runway_imediato_meses::numeric, 2) AS runway_imediato_meses,
  ROUND((runway_imediato_meses * 30)::numeric, 0) AS runway_imediato_dias
FROM kpi_runway_imediato;

SELECT
  ROUND(saldo_liquido::numeric, 2) AS saldo_liquido,
  ROUND(saldo_investimentos::numeric, 2) AS saldo_investimentos,
  ROUND(media_saidas_90d::numeric, 2) AS media_saidas_90d,
  ROUND(runway_total_meses::numeric, 2) AS runway_total_meses,
  ROUND((runway_total_meses * 30)::numeric, 0) AS runway_total_dias
FROM kpi_runway_total;
```

## Números principais (resultado da execução)

### Tabela 1 — Resumo de indicadores

| Indicador | Valor |
|---|---:|
| Custo médio mensal (12m) | R$ 17.095,78 |
| Custo mediano mensal (12m) | R$ 14.815,06 |
| Custo médio sem fev/2026 (outlier) | R$ 12.848,61 |
| Receita operacional média (12m) | R$ 22.584,45 |
| Receita operacional média sem fev/2026 | R$ 16.638,89 |
| Média mensal de empréstimos recebidos | R$ 807,70 |
| Saldo médio mensal | R$ 6.296,37 |
| Meses no vermelho (12m) | 5 |
| Meses no vermelho sem entrada de empréstimo | 6 |

### Tabela 2 — Renda salarial (sem empréstimos)

| Métrica | Valor |
|---|---:|
| Total de salários em 12m | R$ 90.401,82 |
| Meses com salário | 8 |
| Média nos meses com salário | R$ 11.300,23 |
| Média mensal calendário (12m) | R$ 7.533,49 |
| Mediana de salário (meses com salário) | R$ 9.735,87 |

### Tabela 3 — Estrutura de saídas (12m)

| Bucket | Total 12m | Média/mês | % do total |
|---|---:|---:|---:|
| Essenciais | R$ 77.121,33 | R$ 6.426,78 | 37,54% |
| Discricionários | R$ 57.266,96 | R$ 4.772,25 | 27,88% |
| Dívidas | R$ 51.070,09 | R$ 4.255,84 | 24,86% |
| Outros | R$ 19.976,67 | R$ 1.664,72 | 9,72% |

### Tabela 4 — Pressão de crédito e liquidez

| Indicador | Valor |
|---|---:|
| Saídas totais (12m) | R$ 205.435,05 |
| Saídas com dívidas (12m) | R$ 47.599,08 |
| Saídas com dívidas (% do total) | 23,17% |
| Parcelamentos ativos (qtd) | 12 |
| Saldo parcelado restante | R$ 6.199,51 |
| Runway imediato | 12 dias |
| Runway total (caixa + investimentos) | 18 dias |

## Teoria do raciocínio analítico aplicado

### Etapa A — Medir o problema sem viés

Foi usada uma combinação de indicadores para reduzir distorções:

- média (visão geral);
- mediana (valor típico);
- média sem outlier (estabilidade);
- frequência de meses negativos.

Justificativa: apenas média pode mascarar instabilidade de renda e choques pontuais.

### Etapa B — Separar causa operacional de causa financeira

Separação central:

- resultado com empréstimos;
- resultado sem empréstimos;
- renda salarial vs renda total;
- peso mensal de dívidas.

Justificativa: evita interpretar entrada de crédito como melhora estrutural de renda.

### Etapa C — Decompor gasto em blocos acionáveis

As saídas foram classificadas em 4 buckets para suportar decisão:

1. essenciais;
2. discricionários;
3. dívidas;
4. outros.

Justificativa: diagnóstico útil precisa apontar exatamente "onde agir" e "quanto cortar/renegociar".

### Etapa D — Traduzir diagnóstico em plano (50/30/20 adaptado)

Regra teórica aplicada:

- 50% necessidades;
- 30% desejos;
- 20% objetivos financeiros (reserva + amortização).

Adaptação necessária quando há pressão de dívida:

- no curto prazo, priorizar redução de dívidas e discricionários;
- só depois convergir para 50/30/20 clássico.

## Como transformar essa teoria em serviço

### Pipeline sugerido

1. Input: tenant + janela temporal.
2. Extração: consultas SQL padronizadas (como acima).
3. Processamento:
   - KPIs de renda/custo/saldo;
   - detecção de outlier;
   - cálculo de buckets;
   - cálculo de dependência de crédito;
   - cálculo de runway.
4. Motor de diagnóstico:
   - regras de alerta (ex.: dívida > 20% da saída);
   - regras de risco (runway < 30 dias);
   - regras de recomendação (corte mínimo por bucket).
5. Output:
   - resumo executivo;
   - tabela de metas 50/30/20 adaptada;
   - plano de ação de 30/60/90 dias.

### Regras de inferência (teoria)

- Se `media_salario_calendario < essenciais + dividas`, existe risco estrutural de caixa.
- Se `dividas_pct > 20%`, prioridade é desalavancagem.
- Se `discricionarios_pct > 30%`, há espaço de ajuste de comportamento.
- Se `runway_imediato_dias < 30`, situação de urgência financeira.

## Análise de pequenas mudanças e prazo para chegar no 50/30/20

### Premissas usadas nesta projeção

- Janela: últimos 12 meses fechados, com leitura principal sem outlier de fev/2026.
- Renda base usada para projeção: R$ 16.638,89 (média operacional sem fev/2026).
- Volatilidade de renda relevante: coeficiente de variação de 66,81%.

### Estado atual (base sem fev/2026)

| Bloco | Valor mensal médio | % da renda base |
|---|---:|---:|
| Necessidades | R$ 6.219,82 | 37,38% |
| Desejos | R$ 4.135,52 | 24,85% |
| Objetivos/dívidas | R$ 1.232,91 | 7,41% |
| Outros | R$ 1.286,33 | 7,73% |
| Sobra de caixa | R$ 3.764,31 | 22,62% |

Leitura teórica: na média, necessidades e desejos já estão dentro de 50/30. O ponto crítico é transformar parte da sobra em objetivo financeiro recorrente (reserva + amortização), para fechar os 20% com consistência.

### Mudanças pequenas sugeridas (baixo atrito)

1. Reduzir desejos em R$ 800/mês (principalmente compras, restaurantes e delivery).
2. Reduzir necessidades em R$ 200/mês (telecom, energia, pequenos contratos de serviços).
3. Reduzir outros em R$ 300/mês (revisão de transferências e saídas sem categoria).
4. Direcionar +R$ 1.000/mês para objetivos financeiros.

### Cenário simulado com mudanças pequenas

| Bloco | Valor mensal simulado | % da renda base |
|---|---:|---:|
| Necessidades | R$ 6.019,82 | 36,18% |
| Desejos | R$ 3.335,52 | 20,05% |
| Objetivos/dívidas | R$ 2.232,91 | 13,42% |
| Outros | R$ 986,33 | 5,93% |
| Sobra de caixa | R$ 4.064,31 | 24,43% |

Para bater 20% de objetivos na renda base (R$ 3.327,78/mês), faltam R$ 1.094,87 além do bloco de objetivos/dívidas do cenário.

Como a sobra simulada é de R$ 4.064,31/mês, basta reservar automaticamente R$ 1.100/mês dessa sobra para fechar 50/30/20.

### Estimativa de prazo para atingir 50/30/20

1. Em média mensal: 1 mês.
2. Com consistência (3 ciclos seguidos): 2 a 3 meses.
3. Com proteção contra meses fracos de renda: 4 a 6 meses (tempo para formar colchão e reduzir recaída).

### Leitura conservadora (somente salário)

Quando a análise considera apenas salário:

- salário médio (meses com salário, sem fev/2026): R$ 11.914,23;
- despesa média nesses meses: R$ 14.913,83;
- gap médio: -R$ 2.999,60/mês;
- teto de despesa para sobrar 20% do salário: R$ 9.531,39.

Conclusão teórica: com salário isolado, 50/30/20 não fecha com pequenas mudanças; depende de combinação de redução maior de despesa e/ou aumento de renda recorrente.

## Observações

- Esta análise é metodológica e financeira (não é recomendação de investimento).
- A qualidade do diagnóstico depende da qualidade da categorização das transações.
- Para produção, é ideal registrar versão de regra analítica e data de cálculo para auditabilidade.
