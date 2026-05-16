import type { SQL } from "bun";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolError, toolSuccess } from "../common/errors.ts";
import { validateTenant, withTenant } from "../common/db.ts";
import {
  isValidDate,
  isValidMonth,
  validateDateRange,
  validateLimit,
  validateReferenceMonths,
  validateThreshold,
} from "../common/validators.ts";

export function registerFinancialAdvancedTools(server: McpServer, sql: SQL): void {

  // ── 5. get_subscription_analysis ──────────────────────────────────────

  server.tool(
    "get_subscription_analysis",
    "Monitor active subscriptions, detect price changes and identify services that stopped charging. Use to audit recurring costs, find price increases, and spot cancelled or lapsed subscriptions.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      start_date: z.string().describe("Start date inclusive (YYYY-MM-DD)"),
      end_date: z.string().describe("End date exclusive (YYYY-MM-DD)"),
    },
    async ({ tenant_id, start_date, end_date }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);
      if (!isValidDate(start_date)) return toolError(`Invalid start_date: ${start_date}`);
      if (!isValidDate(end_date)) return toolError(`Invalid end_date: ${end_date}`);
      const rangeErr = validateDateRange(start_date, end_date);
      if (rangeErr) return toolError(rangeErr);

      try {
        const rows = await withTenant(sql, tenant_id, async (tx) => {
          return tx<{
            servico: string; keyword_or_merchant: string;
            values: number[]; unique_values: number[];
            first_date: string; last_date: string;
            total: string; count: string;
          }[]>`
            WITH subs AS (
              SELECT
                COALESCE(ai.merchant_name, t.description) AS servico,
                COALESCE(ai.merchant_name, t.description) AS keyword_or_merchant,
                ABS(t.amount_signed) AS valor,
                t.date_day
              FROM f_fluxo_caixa t
              LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
              WHERE t.date_day >= ${start_date}::date AND t.date_day < ${end_date}::date
                AND t.transaction_kind = 'EXPENSE'
                AND (
                  ai.is_recurring = true
                  OR t.description ILIKE '%netflix%'
                  OR t.description ILIKE '%spotify%'
                  OR t.description ILIKE '%amazon prime%'
                  OR t.description ILIKE '%disney%'
                  OR t.description ILIKE '%hbo%'
                  OR t.description ILIKE '%apple%'
                  OR t.description ILIKE '%youtube%'
                  OR t.description ILIKE '%globo play%'
                  OR t.description ILIKE '%assinatura%'
                  OR t.description ILIKE '%mensalidade%'
                )
            )
            SELECT
              servico,
              keyword_or_merchant,
              ARRAY_AGG(valor ORDER BY date_day) AS values,
              ARRAY(SELECT DISTINCT unnest(ARRAY_AGG(ROUND(valor::NUMERIC, 2)))) AS unique_values,
              MIN(date_day)::text AS first_date,
              MAX(date_day)::text AS last_date,
              ROUND(SUM(valor)::NUMERIC, 2) AS total,
              COUNT(*)::text AS count
            FROM subs
            GROUP BY servico, keyword_or_merchant
            HAVING COUNT(*) >= 1
            ORDER BY SUM(valor) DESC
          `;
        });

        // Detect stopped subscriptions: charged before cutoff but not in last 60 days of range
        const thresholdDate = new Date(end_date);
        thresholdDate.setDate(thresholdDate.getDate() - 60);
        const thresholdStr = thresholdDate.toISOString().slice(0, 10);

        const subscriptions = rows.map((r) => {
          const uniqueVals = r.unique_values.map(Number);
          const priceChange =
            uniqueVals.length > 1
              ? { from: Math.min(...uniqueVals), to: Math.max(...uniqueVals) }
              : undefined;
          return {
            servico: r.servico,
            keyword_or_merchant: r.keyword_or_merchant,
            values: r.values.map(Number),
            unique_values: uniqueVals,
            first_date: r.first_date,
            last_date: r.last_date,
            total: Number(r.total),
            count: Number(r.count),
            ...(priceChange ? { price_change: priceChange } : {}),
          };
        });

        const stopped = subscriptions
          .filter((s) => s.last_date < thresholdStr)
          .map((s) => ({
            servico: s.servico,
            ultima_cobranca: s.last_date,
            valor_antigo: s.unique_values[s.unique_values.length - 1] ?? 0,
            meses_ativos: s.count,
          }));

        return toolSuccess({ subscriptions, stopped });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 6. get_credit_card_status ──────────────────────────────────────────

  server.tool(
    "get_credit_card_status",
    "Current status of credit cards: balance, limit, available credit, due date and status flag. Also returns recent bill payments. Use to identify which card is closest to the limit, which expires soonest, or recent bill payment history.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
    },
    async ({ tenant_id }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);

      try {
        const [cards, faturas] = await withTenant(sql, tenant_id, async (tx) => {
          const cardRows = await tx<{
            nome: string; saldo: string | null; limite: string | null;
            disponivel: string | null; vencimento: string | null;
          }[]>`
            SELECT
              COALESCE(name, marketing_name, 'Cartão') AS nome,
              ABS(COALESCE(balance, 0)) AS saldo,
              cc_credit_limit AS limite,
              cc_available_credit_limit AS disponivel,
              cc_balance_due_date AS vencimento
            FROM accounts
            WHERE type = 'CREDIT'
            ORDER BY COALESCE(cc_available_credit_limit, 0) ASC
          `;

          const faturaRows = await tx<{ data: string; valor: string; descricao: string }[]>`
            SELECT
              date_day::text AS data,
              ABS(amount_signed)::text AS valor,
              description AS descricao
            FROM f_transacoes
            WHERE transaction_kind = 'EXPENSE'
              AND is_real_cashflow = false
              AND (
                description ILIKE '%fatura%'
                OR description ILIKE '%pagamento cartao%'
                OR description ILIKE '%pagto cartao%'
              )
            ORDER BY date_day DESC
            LIMIT 10
          `;

          return [cardRows, faturaRows] as const;
        });

        const cardList = cards.map((c) => {
          const saldo = Number(c.saldo ?? 0);
          const limite = c.limite !== null ? Number(c.limite) : null;
          const disponivel = c.disponivel !== null ? Number(c.disponivel) : null;
          const status =
            disponivel !== null && disponivel < 0
              ? "estourado"
              : disponivel !== null && limite !== null && disponivel / limite < 0.1
              ? "critico"
              : "ok";
          return {
            nome: c.nome,
            saldo,
            limite,
            disponivel,
            vencimento: c.vencimento,
            status,
          };
        });

        const ultimas_faturas_pagas = faturas.map((f) => ({
          data: f.data,
          valor: Number(f.valor),
          cartao: f.descricao,
        }));

        return toolSuccess({ cards: cardList, ultimas_faturas_pagas });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 7. get_anomalous_transactions ─────────────────────────────────────

  server.tool(
    "get_anomalous_transactions",
    "Detect atypical transactions by category using AI scores, statistical deviation or both (hybrid). Use to identify outlier expenses, audit suspicious charges, or find which transactions deviate most from the usual pattern.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      start_date: z.string().describe("Start date inclusive (YYYY-MM-DD)"),
      end_date: z.string().describe("End date exclusive (YYYY-MM-DD)"),
      method: z.enum(["ai", "stats", "hybrid"]).default("hybrid").describe("Detection method: ai=anomaly_score, stats=stddev, hybrid=ai when available else stats"),
      threshold: z.number().default(2.5).describe("Deviation threshold (stddev multiplier or AI score cutoff, default 2.5)"),
      min_samples: z.number().int().min(1).default(3).describe("Minimum samples per category for stats detection (default 3)"),
    },
    async ({ tenant_id, start_date, end_date, method, threshold, min_samples }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);
      if (!isValidDate(start_date)) return toolError(`Invalid start_date: ${start_date}`);
      if (!isValidDate(end_date)) return toolError(`Invalid end_date: ${end_date}`);
      const rangeErr = validateDateRange(start_date, end_date);
      if (rangeErr) return toolError(rangeErr);
      const thErr = validateThreshold(threshold);
      if (thErr) return toolError(thErr);

      try {
        const rows = await withTenant(sql, tenant_id, async (tx) => {
          return tx<{
            date: string; description: string; category: string | null; valor: string;
            media_categoria: string | null; desvios_padrao: string | null;
            vezes_acima_media: string | null; anomaly_score_ai: string | null; motivo: string;
          }[]>`
            WITH stats AS (
              SELECT
                COALESCE(category_pt, 'Sem categoria') AS category_pt,
                AVG(ABS(amount_signed)) AS media,
                STDDEV(ABS(amount_signed)) AS stddev,
                COUNT(*) AS cnt
              FROM f_transacoes
              WHERE date_day >= ${start_date}::date AND date_day < ${end_date}::date
                AND transaction_kind = 'EXPENSE'
              GROUP BY category_pt
              HAVING COUNT(*) >= ${min_samples}
            ),
            txn AS (
              SELECT
                t.date_day::text AS date,
                t.description,
                COALESCE(t.category_pt, 'Sem categoria') AS category,
                ABS(t.amount_signed) AS valor,
                ai.anomaly_score
              FROM f_transacoes t
              LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
              WHERE t.date_day >= ${start_date}::date AND t.date_day < ${end_date}::date
                AND t.transaction_kind = 'EXPENSE'
            ),
            scored AS (
              SELECT
                t.date, t.description, t.category, t.valor,
                s.media AS media_categoria,
                CASE WHEN s.stddev > 0 THEN ROUND(((t.valor - s.media) / s.stddev)::NUMERIC, 2) END AS desvios_padrao,
                CASE WHEN s.media > 0 THEN ROUND((t.valor / s.media)::NUMERIC, 2) END AS vezes_acima_media,
                t.anomaly_score AS anomaly_score_ai,
                CASE
                  WHEN ${method} = 'ai' AND t.anomaly_score IS NOT NULL
                    THEN t.anomaly_score >= ${threshold}
                  WHEN ${method} = 'stats' AND s.stddev > 0 AND s.cnt IS NOT NULL
                    THEN t.valor > s.media + ${threshold} * s.stddev
                  WHEN ${method} = 'hybrid'
                    THEN COALESCE(
                      t.anomaly_score >= ${threshold},
                      (s.stddev > 0 AND t.valor > s.media + ${threshold} * s.stddev)
                    )
                  ELSE false
                END AS is_anomaly,
                CASE
                  WHEN ${method} = 'ai' AND t.anomaly_score IS NOT NULL
                    THEN 'AI score ' || ROUND(t.anomaly_score::NUMERIC, 3)
                  WHEN ${method} = 'hybrid' AND t.anomaly_score IS NOT NULL
                    THEN 'AI score ' || ROUND(t.anomaly_score::NUMERIC, 3)
                  WHEN s.stddev > 0
                    THEN ROUND(((t.valor - s.media) / s.stddev)::NUMERIC, 1) || ' desvios da média'
                  ELSE 'valor atípico'
                END AS motivo
              FROM txn t
              LEFT JOIN stats s ON s.category_pt = t.category
            )
            SELECT
              date, description, category,
              ROUND(valor::NUMERIC, 2)::text AS valor,
              ROUND(media_categoria::NUMERIC, 2)::text AS media_categoria,
              desvios_padrao::text,
              vezes_acima_media::text,
              ROUND(anomaly_score_ai::NUMERIC, 4)::text AS anomaly_score_ai,
              motivo
            FROM scored
            WHERE is_anomaly = true
            ORDER BY valor DESC
            LIMIT 100
          `;
        });

        const anomalies = rows.map((r) => ({
          date: r.date,
          description: r.description,
          category: r.category ?? "Sem categoria",
          valor: Number(r.valor),
          media_categoria: r.media_categoria !== null ? Number(r.media_categoria) : null,
          desvios_padrao: r.desvios_padrao !== null ? Number(r.desvios_padrao) : null,
          vezes_acima_media: r.vezes_acima_media !== null ? Number(r.vezes_acima_media) : null,
          anomaly_score_ai: r.anomaly_score_ai !== null ? Number(r.anomaly_score_ai) : null,
          motivo: r.motivo,
        }));

        return toolSuccess({ anomalies });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 8. get_projection ─────────────────────────────────────────────────

  server.tool(
    "get_projection",
    "Project the month-end closing based on spending already occurred and future commitments (installments). Returns spending buckets, projected remainder, estimated total, real income and projected balance. Alerts are generated when balance is likely negative or commitments are high.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      target_month: z.string().describe("Target month in YYYY-MM format"),
      reference_months: z.number().int().min(1).max(24).default(3).describe("Number of past months used for rate estimation (default 3)"),
    },
    async ({ tenant_id, target_month, reference_months }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);
      if (!isValidMonth(target_month)) return toolError(`Invalid target_month: ${target_month} (expected YYYY-MM)`);
      const refErr = validateReferenceMonths(reference_months);
      if (refErr) return toolError(refErr);

      try {
        const [year, month] = target_month.split("-").map(Number);
        const monthStart = `${target_month}-01`;
        const nextMonth = month! === 12 ? `${year! + 1}-01-01` : `${year}-${String(month! + 1).padStart(2, "0")}-01`;
        const today = new Date().toISOString().slice(0, 10);
        const isCurrentMonth = today >= monthStart && today < nextMonth;
        const cutoff = isCurrentMonth ? today : nextMonth;

        const data = await withTenant(sql, tenant_id, async (tx) => {
          const ocorridoRows = await tx<{
            bucket: string; total: string;
          }[]>`
            WITH classified AS (
              SELECT
                ABS(t.amount_signed) AS valor,
                CASE
                  WHEN p.transaction_id IS NOT NULL THEN 'parcelas_fixas'
                  WHEN t.category_group_pt ILIKE '%energia%'
                    OR t.category_group_pt ILIKE '%utilidade%'
                    OR t.description ILIKE '%conta de luz%' THEN 'contas_energia'
                  WHEN t.category_group_pt ILIKE '%juro%'
                    OR t.category_group_pt ILIKE '%multa%'
                    OR t.description ILIKE '%juros%' THEN 'juros_multas'
                  WHEN ai.is_recurring = true
                    OR t.description ILIKE '%netflix%'
                    OR t.description ILIKE '%spotify%'
                    OR t.description ILIKE '%assinatura%' THEN 'assinaturas'
                  ELSE 'diaadia'
                END AS bucket
              FROM f_transacoes t
              LEFT JOIN f_parcelas p ON p.transaction_id = t.transaction_id
              LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
              WHERE t.date_day >= ${monthStart}::date AND t.date_day < ${cutoff}::date
                AND t.transaction_kind IN ('EXPENSE', 'INVEST')
                AND t.is_real_cashflow = true
            )
            SELECT bucket, ROUND(SUM(valor)::NUMERIC, 2)::text AS total
            FROM classified GROUP BY bucket
          `;

          const futureRows = await tx<{ total: string }[]>`
            SELECT ROUND(COALESCE(SUM(amount), 0)::NUMERIC, 2)::text AS total
            FROM f_parcelas_futuras
            WHERE date_day >= ${cutoff}::date AND date_day < ${nextMonth}::date
          `;

          const incomeRows = await tx<{ receitas_reais: string }[]>`
            SELECT ROUND(COALESCE(SUM(amount_signed), 0)::NUMERIC, 2)::text AS receitas_reais
            FROM f_transacoes
            WHERE date_day >= ${monthStart}::date AND date_day < ${nextMonth}::date
              AND transaction_kind = 'INCOME' AND is_real_cashflow = true
          `;

          const rateRows = await tx<{ daily_rate: string }[]>`
            SELECT ROUND(
              COALESCE(SUM(ABS(amount_signed)) FILTER (WHERE is_real_cashflow AND transaction_kind IN ('EXPENSE','INVEST')), 0)
              / GREATEST(COUNT(DISTINCT date_day) FILTER (WHERE is_real_cashflow AND transaction_kind IN ('EXPENSE','INVEST')), 1),
            2)::text AS daily_rate
            FROM f_transacoes
            WHERE date_day >= (${monthStart}::date - (${reference_months} * 30)::int)
              AND date_day < ${monthStart}::date
          `;

          return { ocorridoRows, futureRows, incomeRows, rateRows };
        });

        const bucketMap: Record<string, number> = {};
        for (const r of data.ocorridoRows) bucketMap[r.bucket] = Number(r.total);

        const gastos_ja_ocorridos = {
          parcelas_fixas: bucketMap["parcelas_fixas"] ?? 0,
          contas_energia: bucketMap["contas_energia"] ?? 0,
          juros_multas: bucketMap["juros_multas"] ?? 0,
          assinaturas: bucketMap["assinaturas"] ?? 0,
          diaadia: bucketMap["diaadia"] ?? 0,
          total: Object.values(bucketMap).reduce((a, b) => a + b, 0),
        };

        const today2 = new Date();
        const monthEndDate = new Date(nextMonth);
        const dias_passados = isCurrentMonth
          ? Math.ceil((today2.getTime() - new Date(monthStart).getTime()) / 86400000)
          : Math.ceil((monthEndDate.getTime() - new Date(monthStart).getTime()) / 86400000);
        const dias_restantes = isCurrentMonth
          ? Math.ceil((monthEndDate.getTime() - today2.getTime()) / 86400000)
          : 0;

        const futureCommitments = Number(data.futureRows[0]?.total ?? 0);
        const dailyRate = Number(data.rateRows[0]?.daily_rate ?? 0);
        const projecao_restante = {
          parcelas_futuras: futureCommitments,
          ritmo_diario: Math.round(dailyRate * dias_restantes * 100) / 100,
          total: Math.round((futureCommitments + dailyRate * dias_restantes) * 100) / 100,
        };

        const receitas_reais = Number(data.incomeRows[0]?.receitas_reais ?? 0);
        const total_projetado_mes = Math.round((gastos_ja_ocorridos.total + projecao_restante.total) * 100) / 100;
        const saldo_projetado = Math.round((receitas_reais - total_projetado_mes) * 100) / 100;

        const alertas: string[] = [];
        if (saldo_projetado < 0) alertas.push(`Saldo negativo projetado: R$ ${saldo_projetado.toFixed(2)}`);
        if (futureCommitments > receitas_reais * 0.5) alertas.push("Compromissos futuros excedem 50% da receita do mês");
        if (gastos_ja_ocorridos.juros_multas > 0) alertas.push(`Juros/multas detectados: R$ ${gastos_ja_ocorridos.juros_multas.toFixed(2)}`);

        return toolSuccess({
          target_month,
          dias_passados,
          dias_restantes,
          gastos_ja_ocorridos,
          projecao_restante,
          total_projetado_mes,
          receitas_reais,
          saldo_projetado,
          alertas,
        });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 9. get_raw_transactions ────────────────────────────────────────────

  server.tool(
    "get_raw_transactions",
    "Detailed transaction list with dynamic filters: date range, text search, category, amount range, type and pagination. Use to inspect specific transactions, explain monthly variations, or identify the exact transaction behind an anomaly.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      start_date: z.string().describe("Start date inclusive (YYYY-MM-DD)"),
      end_date: z.string().describe("End date exclusive (YYYY-MM-DD)"),
      search_term: z.string().optional().describe("Filter by description text (case-insensitive)"),
      category: z.string().optional().describe("Filter by exact category_pt name"),
      min_amount: z.number().optional().describe("Minimum absolute amount"),
      max_amount: z.number().optional().describe("Maximum absolute amount"),
      transaction_type: z.enum(["income", "expense"]).optional().describe("income=INCOME only, expense=EXPENSE/INVEST only"),
      limit: z.number().int().min(1).max(200).default(50).describe("Max rows (default 50, max 200)"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset (default 0)"),
    },
    async ({ tenant_id, start_date, end_date, search_term, category, min_amount, max_amount, transaction_type, limit, offset }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);
      if (!isValidDate(start_date)) return toolError(`Invalid start_date: ${start_date}`);
      if (!isValidDate(end_date)) return toolError(`Invalid end_date: ${end_date}`);
      const rangeErr = validateDateRange(start_date, end_date);
      if (rangeErr) return toolError(rangeErr);
      const limitErr = validateLimit(limit);
      if (limitErr) return toolError(limitErr);

      try {
        const rows = await withTenant(sql, tenant_id, async (tx) => {
          const isIncome = transaction_type === "income";
          const isExpense = transaction_type === "expense";
          const searchPat = search_term ? `%${search_term}%` : null;
          const minAmt = min_amount ?? null;
          const maxAmt = max_amount ?? null;
          const catFilter = category ?? null;

          return tx<{
            date: string; description: string; amount: string;
            category_pt: string | null; category_group: string | null;
            is_real_cashflow: boolean; transaction_kind: string;
            merchant_name: string | null; anomaly_score: string | null; tags: string[] | null;
          }[]>`
            SELECT
              t.date_day::text AS date,
              t.description,
              ROUND(t.amount_signed::NUMERIC, 2)::text AS amount,
              t.category_pt,
              t.category_group_pt AS category_group,
              t.is_real_cashflow,
              t.transaction_kind,
              ai.merchant_name,
              ROUND(ai.anomaly_score::NUMERIC, 4)::text AS anomaly_score,
              ai.tags
            FROM f_transacoes t
            LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
            WHERE t.date_day >= ${start_date}::date AND t.date_day < ${end_date}::date
              AND (
                ${isIncome} AND t.transaction_kind = 'INCOME'
                OR ${isExpense} AND t.transaction_kind IN ('EXPENSE', 'INVEST')
                OR (NOT ${isIncome} AND NOT ${isExpense})
              )
              AND (${searchPat}::text IS NULL OR t.description ILIKE ${searchPat ?? ""})
              AND (${catFilter}::text IS NULL OR t.category_pt = ${catFilter ?? ""})
              AND (${minAmt}::numeric IS NULL OR ABS(t.amount_signed) >= ${minAmt ?? 0}::numeric)
              AND (${maxAmt}::numeric IS NULL OR ABS(t.amount_signed) <= ${maxAmt ?? 0}::numeric)
            ORDER BY t.date_day DESC, ABS(t.amount_signed) DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
        });

        const result = rows.map((r) => ({
          date: r.date,
          description: r.description,
          amount: Number(r.amount),
          category_pt: r.category_pt,
          category_group: r.category_group,
          is_real_cashflow: r.is_real_cashflow,
          transaction_kind: r.transaction_kind,
          merchant_name: r.merchant_name,
          anomaly_score: r.anomaly_score !== null ? Number(r.anomaly_score) : null,
          tags: r.tags,
        }));

        return toolSuccess(result);
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
