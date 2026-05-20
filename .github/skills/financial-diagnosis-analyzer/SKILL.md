---
name: financial-diagnosis-analyzer
description: "Use when: diagnosticar perfil financeiro, calcular renda media, custo medio, meses no vermelho, runway, dependencia de emprestimos, causa raiz de deficit, gastos por bucket 50/30/20 e explicar por que um usuario esta gastando mais do que recebe. Sempre resolve tenant antes de consultar Postgres."
argument-hint: "Usuario e periodo da analise, ex.: Wilson ultimos 12 meses"
---

# Financial Diagnosis Analyzer

## Quando usar

Use esta skill para responder perguntas como:

- qual e meu custo medio mensal?
- qual e minha renda media sem emprestimos?
- por que estou no vermelho?
- estou gastando mais do que recebo?
- qual e a causa raiz do deficit?
- como meus gastos se dividem em necessidades, desejos, dividas e outros?
- qual e meu runway financeiro?

Esta skill faz diagnostico. Para plano de corte e projecao de cenarios, use `financial-action-plan-forecaster`.

## Regra default obrigatoria: resolver tenant

Antes de qualquer consulta financeira:

1. Se o usuario ja indicou claramente o usuario/tenant na conversa, use esse contexto.
2. Se nao indicou, pergunte qual usuario investigar.
3. Consulte a tabela `tenants` para resolver o ID real do ambiente atual.
4. Nao confie em IDs hardcoded em documentos antigos.
5. Execute consultas analiticas com usuario `finance` e `SET app.tenant_id`.

Consulta de resolucao:

```sql
SELECT id, name, email
FROM tenants
ORDER BY name;
```

Padrao de execucao:

```bash
docker exec mcp-finance-postgres-1 psql -U finance -d finance -c "
SET app.tenant_id = '<tenant_id>';
<SQL_DA_ANALISE>
"
```

## Procedimento

### 1. Definir janela de analise

Padrao recomendado:

- ultimos 12 meses fechados para diagnostico estrutural;
- ultimos 90 dias para sinais recentes;
- remover ou comparar outlier quando houver mes claramente excepcional.

### 2. Calcular serie mensal de fluxo de caixa

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

Use para identificar:

- meses no vermelho;
- meses em que emprestimos mascaram deficit;
- meses fora da curva;
- diferenca entre receita total e receita operacional.

### 3. Calcular KPIs principais

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
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY total_despesas)::numeric, 2) AS custo_mediano_mes,
  ROUND(AVG(total_receitas_operacionais)::numeric, 2) AS renda_operacional_media_mes,
  ROUND(AVG(total_receitas)::numeric, 2) AS renda_total_media_mes,
  ROUND(AVG(total_emprestimos)::numeric, 2) AS media_emprestimos_mes,
  ROUND(AVG(saldo_liquido)::numeric, 2) AS saldo_medio_mes,
  SUM(CASE WHEN saldo_liquido < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho,
  SUM(CASE WHEN (total_receitas_operacionais - total_despesas) < 0 THEN 1 ELSE 0 END) AS meses_no_vermelho_sem_emprestimo,
  ROUND(AVG(total_receitas_operacionais - total_despesas)::numeric, 2) AS saldo_medio_sem_emprestimo
FROM recorte;
```

### 4. Separar salario de outras entradas

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
  ROUND((SUM(total_salario) / 12.0)::numeric, 2) AS media_mensal_calendario_12m,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY total_salario)::numeric, 2) AS mediana_salario
FROM recorte;
```

Observacao: se uma instalacao futura mudar o texto da categoria, primeiro consulte os valores reais de `category_pt`.

### 5. Mapear causa raiz por buckets

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
      ) THEN 'necessidades'
      WHEN category_group_pt IN ('Compras','Alimentação','Serviços Digitais','Viagem','Doações')
        THEN 'desejos'
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

Observacao: se uma instalacao futura mudar os textos de categorias, primeiro consulte os valores reais de `category_group_pt` e `category_pt`.

### 6. Calcular runway

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

## Regras de interpretacao

- Se `media_salario_calendario < necessidades + dividas`, existe risco estrutural de caixa.
- Se `meses_no_vermelho_sem_emprestimo > meses_no_vermelho`, emprestimos estao mascarando deficit.
- Se `dividas_pct > 20%`, prioridade e desalavancagem.
- Se `desejos_pct > 30%`, existe espaco claro de ajuste comportamental.
- Se `runway_total_dias < 30`, tratar como urgencia financeira.

## Saida esperada

Responda em portugues do Brasil com:

1. resumo executivo;
2. tabela de KPIs principais;
3. explicacao objetiva da causa raiz;
4. riscos imediatos;
5. proximos passos sugeridos.

Quando o usuario pedir, salve a analise em Markdown dentro de `docs/`.
