# Catalogo MCP de 12 Tools para Financas

Data de referencia: 2026-05-16
Status: Discovery funcional, pronto para virar especificacao OpenSpec

## Objetivo

Definir um catalogo de 12 tools MCP para responder perguntas financeiras de usuarios com foco em:

- Analise de caixa
- Comportamento de gasto
- Assinaturas e cartao
- Investigacao de anomalias
- Projecoes
- Estado de maturidade AI e operacao de filas

## Regras obrigatorias de multi-tenant

Estas regras valem para todas as tools:

1. Tenant sempre escopado.
2. Toda consulta deve rodar com SET app.tenant_id antes do SELECT.
3. Se a tool aceitar tenant_id no input, validar tenant_id contra o contexto autenticado.
4. Nunca usar user_id hardcoded.
5. Nunca retornar dados de outro tenant em erro, log, ou fallback.

Recomendacao de contrato para todas as tools:

- Input comum:
  - tenant_id: string UUID (obrigatorio quando nao houver contexto autenticado)
- Validacao:
  - formato UUID valido
  - tenant existe e esta ativo

## Convencoes de API das tools

1. Datas no formato YYYY-MM-DD.
2. Intervalo de data preferencial: start_date inclusivo e end_date exclusivo.
3. Valores monetarios em BRL com 2 casas na resposta.
4. Limites padrao para listas grandes:
   - limit padrao 50
   - maximo 200
5. Erros de validacao retornam isError true com mensagem descritiva.
6. Ferramentas analiticas devem ser read-only.

## Visao geral do catalogo

1. get_monthly_balance
2. get_top_categories
3. get_daily_spending_breakdown
4. get_spending_by_day_of_week
5. get_subscription_analysis
6. get_credit_card_status
7. get_anomalous_transactions
8. get_projection
9. get_raw_transactions
10. get_digest_status
11. get_forecast_status
12. get_pipeline_health

---

## 1. get_monthly_balance

Proposito: Balanco mensal de receitas x despesas com separacao de eventos que podem distorcer leitura operacional.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string

Output:

- array de:
  - year: int
  - month: int
  - receitas_reais: float
  - estornos_fatura: float
  - despesas_reais: float
  - saldo_operacional: float
  - total_transacoes: int
  - transacoes_reais: int

Fontes sugeridas:

- f_transacoes
- cube_cashflow_mensal (para reconciliacao)

Perguntas que responde:

1. Quanto sobrou em cada mes no ultimo ano?
2. Teve piora por aumento de despesa ou queda de receita?
3. O mes foi distorcido por pagamento de fatura e transferencias?

---

## 2. get_top_categories

Proposito: Ranking de categorias com peso relativo e ticket medio no periodo.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string
- limit: int default 20
- cashflow_type: string default real
  - real: is_real_cashflow true
  - all: todos os tipos

Output:

- array de:
  - categoria: string
  - grupo: string
  - total: float
  - quantidade: int
  - percentual: float
  - ticket_medio: float

Fontes sugeridas:

- f_fluxo_caixa para real
- f_transacoes para all

Perguntas que responde:

1. Quais categorias mais pesam no meu gasto?
2. Onde concentrar corte sem mexer em tudo?
3. Qual categoria subiu mais no periodo?

---

## 3. get_daily_spending_breakdown

Proposito: Quebrar despesa por buckets economicos para projecao realista.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string

Output:

- array de:
  - year: int
  - month: int
  - dias_com_gasto: int
  - parcelas_fixas: float
  - contas_energia: float
  - juros_multas: float
  - assinaturas: float
  - diaadia: float
  - total_despesas: float
  - receitas_reais: float

Estrategia recomendada de classificacao:

1. Parcelas fixas: priorizar dados estruturados de f_parcelas e f_parcelas_futuras.
2. Juros e multas: category_group_pt mais fallback por keywords.
3. Assinaturas: merchant_name de ai_transaction_insights mais fallback por keywords.
4. Dia a dia: residual.

Perguntas que responde:

1. Quanto do meu gasto e fixo versus variavel?
2. Meu problema principal e divida, assinatura ou consumo diario?
3. Onde ha ganho rapido sem romper compromisso ja assumido?

---

## 4. get_spending_by_day_of_week

Proposito: Detectar padrao de gasto por dia da semana.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string
- category_filter: string array opcional

Output:

- array de:
  - dia_semana: string
  - total: float
  - quantidade: int
  - ticket_medio: float

Fontes sugeridas:

- f_fluxo_caixa
- d_data opcional para nome do dia

Perguntas que responde:

1. Gasto mais em fim de semana?
2. Delivery e mercado estao concentrados em quais dias?
3. Qual dia tem pior ticket medio?

---

## 5. get_subscription_analysis

Proposito: Monitorar assinaturas, variacao de preco e servicos que pararam de cobrar.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string

Output:

- subscriptions: array de:
  - servico: string
  - keyword_or_merchant: string
  - values: float array
  - unique_values: float array
  - first_date: string
  - last_date: string
  - total: float
  - count: int
  - price_change: objeto opcional
- stopped: array de:
  - servico: string
  - ultima_cobranca: string
  - valor_antigo: float
  - meses_ativos: int

Fontes sugeridas:

- ai_transaction_insights para merchant_name e recorrencia
- f_fluxo_caixa para valores
- fallback por keywords em description

Perguntas que responde:

1. Quais assinaturas ativas tenho hoje?
2. O que aumentou de preco?
3. Qual assinatura deixou de cobrar?

---

## 6. get_credit_card_status

Proposito: Situacao atual de cartoes e ultimos pagamentos de fatura.

Input:

- tenant_id: string UUID

Output:

- cards: array de:
  - nome: string
  - saldo: float
  - limite: float
  - disponivel: float
  - vencimento: string
  - status: string
- ultimas_faturas_pagas: array de:
  - data: string
  - valor: float
  - cartao: string

Fontes sugeridas:

- accounts type CREDIT
- f_transacoes filtrando descricao de fatura

Perguntas que responde:

1. Qual cartao esta mais perto de estourar?
2. Qual vence primeiro?
3. Quanto paguei de fatura recentemente?

---

## 7. get_anomalous_transactions

Proposito: Detectar lancamentos atipicos por categoria.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string
- method: string default hybrid
  - ai: usa anomaly_score
  - stats: usa stddev e threshold
  - hybrid: ai quando existir, stats como fallback
- threshold: float default 2.5
- min_samples: int default 3

Output:

- anomalies: array de:
  - date: string
  - description: string
  - category: string
  - valor: float
  - media_categoria: float
  - desvios_padrao: float opcional
  - vezes_acima_media: float opcional
  - anomaly_score_ai: float opcional
  - motivo: string

Fontes sugeridas:

- f_transacoes ou f_fluxo_caixa
- ai_transaction_insights

Perguntas que responde:

1. Quais gastos estao fora do meu padrao?
2. Isso e um outlier estatistico ou sinal de risco real?
3. Quais lancamentos devo auditar primeiro?

---

## 8. get_projection

Proposito: Projetar fechamento do mes com base em gasto ja ocorrido e compromissos futuros.

Input:

- tenant_id: string UUID
- target_month: string YYYY-MM
- reference_months: int default 3

Output:

- objeto:
  - target_month: string
  - dias_passados: int
  - dias_restantes: int
  - gastos_ja_ocorridos: objeto por bucket
  - projecao_restante: objeto
  - total_projetado_mes: float
  - receitas_reais: float
  - saldo_projetado: float
  - alertas: string array

Dependencias recomendadas:

- get_daily_spending_breakdown
- cube_compromissos_ativos
- f_parcelas_futuras
- cube_cashflow_projetado

Perguntas que responde:

1. Se eu seguir o ritmo atual, quanto sobra no fim do mes?
2. Quanto ja esta travado em compromissos?
3. Qual alerta exige acao imediata?

---

## 9. get_raw_transactions

Proposito: Inspecao detalhada de transacoes com filtros dinamicos.

Input:

- tenant_id: string UUID
- start_date: string
- end_date: string
- search_term: string opcional
- category: string opcional
- min_amount: float opcional
- max_amount: float opcional
- transaction_type: string opcional
  - income
  - expense
- limit: int default 50
- offset: int default 0

Output:

- array de:
  - date: string
  - description: string
  - amount: float
  - category_pt: string
  - category_group: string
  - is_real_cashflow: bool
  - transaction_kind: string
  - merchant_name: string opcional
  - anomaly_score: float opcional
  - tags: string array opcional

Fontes sugeridas:

- f_transacoes
- left join ai_transaction_insights

Perguntas que responde:

1. Mostra transacoes acima de valor X no periodo.
2. Quais lancamentos de uma categoria explicam a variacao mensal?
3. Qual foi a transacao exata que gerou a anomalia?

---

## 10. get_digest_status

Proposito: Estado da analise mensal de IA e cobertura de enriquecimento.

Input:

- tenant_id: string UUID
- year: int
- month: int

Output:

- status: string
  - ready
  - pending
  - missing
- coverage:
  - total: int
  - enriched: int
  - ratio: float
- digest:
  - digest_at: string opcional
  - model_version: string opcional
  - flags: string array opcional

Fontes sugeridas:

- ai_monthly_digest
- getDigestCoverage baseado em f_transacoes mais ai_transaction_insights

Perguntas que responde:

1. Por que nao apareceu narrativa de IA no mes?
2. Falta enriquecimento ou o digest ainda nao rodou?
3. Quando foi a ultima geracao do digest?

---

## 11. get_forecast_status

Proposito: Estado da previsao de ML e qualidade do ultimo treino.

Input:

- tenant_id: string UUID

Output:

- has_forecast: bool
- latest_model_meta:
  - trained_at: string opcional
  - months_of_history: int opcional
  - num_categories: int opcional
  - mae: float opcional
  - mape: float opcional
  - status: string opcional
  - error_message: string opcional
- predictions_summary:
  - target_months: string array
  - groups: array com predicted_total e intervalo

Fontes sugeridas:

- forecast_model_meta
- forecast_predictions

Perguntas que responde:

1. Existe previsao disponivel para proximo mes?
2. O modelo treinou recentemente?
3. A qualidade do treino permite confiar na projecao?

---

## 12. get_pipeline_health

Proposito: Visao operacional de filas e workers para diagnosticar atrasos de AI e forecast.

Escopo: Admin/Operacao

Input:

- tenant_id: string UUID opcional
- include_global: bool default true

Output:

- workers: array
  - id
  - name
  - kind
  - status
  - error_count
  - jobs_done
  - last_seen_at
- queues:
  - enrich_jobs: pending, running, done, error
  - digest_jobs: pending, running, done, error, skipped
  - forecast_jobs: pending, running, done, error
  - ml_training_jobs: pending, running, done, error
- diagnostics:
  - stuck_jobs: array opcional
  - recent_errors: array opcional

Fontes sugeridas:

- workers
- enrich_jobs
- digest_jobs
- forecast_jobs
- ml_training_jobs

Perguntas que responde:

1. Por que os insights estao atrasados?
2. Existe worker fora do ar ou com erro recorrente?
3. Qual fila esta gargalando o sistema?

---

## Composicoes de tools recomendadas

1. Diagnostico de resultado do mes:
   - get_monthly_balance
   - get_top_categories
   - get_raw_transactions
   - get_digest_status

2. Corte inteligente de gastos:
   - get_daily_spending_breakdown
   - get_top_categories
   - get_spending_by_day_of_week
   - get_subscription_analysis

3. Risco de cartao e fechamento de mes:
   - get_credit_card_status
   - get_projection
   - get_raw_transactions

4. Confiabilidade de previsao:
   - get_forecast_status
   - get_projection
   - get_pipeline_health

## Priorizacao sugerida de implementacao

Fase 1 (alto valor imediato):

1. get_monthly_balance
2. get_top_categories
3. get_raw_transactions
4. get_credit_card_status
5. get_spending_by_day_of_week
6. get_anomalous_transactions

Fase 2 (inteligencia e projecao):

7. get_daily_spending_breakdown
8. get_subscription_analysis
9. get_projection
10. get_digest_status

Fase 3 (maturidade operacional e forecast):

11. get_forecast_status
12. get_pipeline_health
