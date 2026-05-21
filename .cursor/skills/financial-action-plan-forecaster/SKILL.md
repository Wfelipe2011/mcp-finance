---
name: financial-action-plan-forecaster
description: "Use when: gerar plano de cortes financeiros, indicar onde cortar gastos, detalhar servicos, delivery, eletronicos, compras gerais, simular corte mensal, projetar 3/6/12 meses, estimar quando chega no 50/30/20, criar checklist e plano operacional. Sempre resolve tenant antes de consultar Postgres."
argument-hint: "Usuario, corte desejado e horizonte, ex.: Wilson cortar 3000 em 6 meses"
---

# Financial Action Plan Forecaster

## Quando usar

Use esta skill para responder perguntas como:

- o que preciso fazer para sair do vermelho?
- onde devo cortar?
- quais servicos, eletronicos, delivery ou compras devem ser reduzidos?
- quanto cortar por categoria?
- como aplicar 50/30/20?
- quando vou chegar no 50/30/20?
- como estarei em 6 meses se cortar R$ 3.000 por mes?
- crie checklist semanal ou plano operacional.

Esta skill cria plano e projecao. Para diagnostico inicial e causa raiz, use `financial-diagnosis-analyzer`.

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

### 1. Determinar meta de corte

Se o usuario nao informar uma meta, calcule:

- gap mensal entre renda recorrente e despesa recente;
- valor minimo para parar de piorar;
- valor recomendado para gerar sobra e amortizar dividas.

Consultas uteis:

```sql
WITH gastos_90 AS (
  SELECT SUM(ABS(amount_signed)) / 3.0 AS despesa_media_90d
  FROM f_fluxo_caixa
  WHERE amount_signed < 0
    AND date_day >= current_date - interval '90 days'
),
renda_12m AS (
  SELECT
    AVG(total_receitas_operacionais) AS renda_media_12m,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY total_receitas_operacionais) AS renda_mediana_12m
  FROM cube_cashflow_mensal
  WHERE make_date(year, month, 1) >= date_trunc('month', current_date) - interval '12 months'
    AND make_date(year, month, 1) < date_trunc('month', current_date)
)
SELECT
  ROUND(g.despesa_media_90d::numeric, 2) AS despesa_media_90d,
  ROUND(r.renda_media_12m::numeric, 2) AS renda_media_12m,
  ROUND(r.renda_mediana_12m::numeric, 2) AS renda_mediana_12m,
  ROUND((g.despesa_media_90d - r.renda_mediana_12m)::numeric, 2) AS gap_estavel
FROM gastos_90 g CROSS JOIN renda_12m r;
```

### 2. Encontrar categorias de maior potencial de corte

Use ultimos 90 dias para acao imediata.

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  COALESCE(category_pt, '(sem categoria)') AS categoria,
  ROUND(SUM(ABS(amount_signed))::numeric, 2) AS total_90d,
  ROUND((SUM(ABS(amount_signed)) / 3.0)::numeric, 2) AS media_mes_90d
FROM f_fluxo_caixa
WHERE amount_signed < 0
  AND date_day >= current_date - interval '90 days'
GROUP BY 1, 2
ORDER BY total_90d DESC;
```

Priorize cortes em:

- delivery e restaurantes;
- eletronicos e marketplaces;
- compras gerais;
- servicos recorrentes e avulsos;
- transferencias sem finalidade clara;
- viagem/lazer eventual;
- juros e dividas renegociaveis.

### 3. Detalhar por descricao/lojista

```sql
SELECT
  COALESCE(category_group_pt, '(sem grupo)') AS grupo,
  LEFT(COALESCE(description, '(sem descricao)'), 70) AS descricao,
  ROUND(SUM(ABS(amount_signed))::numeric, 2) AS total_90d,
  COUNT(*) AS qtd
FROM f_fluxo_caixa
WHERE amount_signed < 0
  AND date_day >= current_date - interval '90 days'
  AND category_group_pt IN ('Serviços','Compras','Alimentação','Serviços Digitais','Transferências')
GROUP BY 1, 2
ORDER BY total_90d DESC
LIMIT 50;
```

Observacao: se uma instalacao futura mudar os textos de categorias, primeiro consulte os valores reais de `category_group_pt` e `category_pt`.

Use essa lista para dizer exatamente onde agir: fornecedores, apps, lojas, plataformas e recorrencias.

### 4. Construir plano de corte

Monte uma tabela com:

- frente de corte;
- gasto atual mensal;
- teto novo mensal;
- corte mensal;
- acao pratica.

Modelo:

| Frente de corte | Gasto atual/mes | Teto novo/mes | Corte mensal | Acao |
|---|---:|---:|---:|---|
| Delivery + restaurantes | R$ X | R$ Y | R$ Z | Delivery zero por 60 dias + marmitas |
| Eletronicos/marketplace | R$ X | R$ Y | R$ Z | Congelar por 6 meses |
| Servicos variaveis | R$ X | R$ Y | R$ Z | Cancelar/downgrade/renegociar |

### 5. Criar projecao de cenarios

Use pelo menos tres cenarios:

- base: renda media operacional sem outlier;
- estavel: renda mediana operacional;
- conservador: salario medio ou renda recorrente mais restrita.

```sql
WITH desp AS (
  SELECT SUM(ABS(amount_signed)) / 3.0 AS despesa_media_90d
  FROM f_fluxo_caixa
  WHERE amount_signed < 0
    AND date_day >= current_date - interval '90 days'
),
renda12 AS (
  SELECT
    AVG(total_receitas_operacionais) AS media_operacional_12m,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY total_receitas_operacionais) AS mediana_operacional_12m
  FROM cube_cashflow_mensal
  WHERE make_date(year, month, 1) >= date_trunc('month', current_date) - interval '12 months'
    AND make_date(year, month, 1) < date_trunc('month', current_date)
),
salario AS (
  SELECT AVG(total_salario) AS salario_medio
  FROM (
    SELECT date_trunc('month', date_day)::date AS mes, SUM(amount_signed) AS total_salario
    FROM f_fluxo_caixa
    WHERE amount_signed > 0
      AND category_pt = 'Salário'
      AND date_day >= date_trunc('month', current_date) - interval '6 months'
      AND date_day < date_trunc('month', current_date)
    GROUP BY 1
  ) s
)
SELECT
  ROUND(d.despesa_media_90d::numeric, 2) AS despesa_media_90d,
  ROUND((d.despesa_media_90d - <CORTE_MENSAL>)::numeric, 2) AS despesa_pos_corte,
  ROUND((r.media_operacional_12m - (d.despesa_media_90d - <CORTE_MENSAL>))::numeric, 2) AS sobra_mensal_base,
  ROUND((r.mediana_operacional_12m - (d.despesa_media_90d - <CORTE_MENSAL>))::numeric, 2) AS sobra_mensal_estavel,
  ROUND((s.salario_medio - (d.despesa_media_90d - <CORTE_MENSAL>))::numeric, 2) AS sobra_mensal_conservadora
FROM desp d CROSS JOIN renda12 r CROSS JOIN salario s;
```

Observacao: se uma instalacao futura mudar o texto da categoria, primeiro consulte os valores reais de `category_pt`.

### 6. Projetar 50/30/20

Para cada cenario, calcule:

- necessidades <= 50% da renda;
- desejos <= 30% da renda;
- objetivos financeiros >= 20% da renda.

Se o usuario estiver endividado, trate `objetivos financeiros` como:

1. reserva minima de emergencia;
2. amortizacao de divida cara;
3. investimentos apenas depois de reduzir risco de caixa.

### 7. Entregar checklist quando solicitado

Se o usuario pedir checklist, gerar:

- checklist diario;
- checklist semanal;
- roteiro por semanas (ex.: 24 semanas para 6 meses);
- painel mensal de acompanhamento;
- gatilhos de alerta.

## Regras de interpretacao

- Corte bom e o que reduz recorrencia, nao so gasto pontual.
- Delivery pode virar zero por 60 dias quando o caixa esta pressionado.
- Eletronicos e marketplace devem ser congelados se ha divida/cartao/parcelas ativas.
- Cartao nao deve compensar teto estourado.
- Plano realista sempre precisa de teto semanal, nao apenas meta mensal.

## Saida esperada

Responda em portugues do Brasil com:

1. resumo objetivo;
2. tabela de corte por categoria;
3. acoes especificas por descricao/lojista quando disponiveis;
4. projecao de 3/6/12 meses conforme solicitado;
5. estimativa de quando chega ao 50/30/20;
6. checklist ou arquivo Markdown se o usuario pedir.

Quando salvar arquivos, use `docs/` e nomes descritivos.
