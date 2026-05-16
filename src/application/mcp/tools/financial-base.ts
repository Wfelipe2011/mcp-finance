import type { SQL } from "bun";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolError, toolSuccess } from "../common/errors.ts";
import { validateTenant, withTenant } from "../common/db.ts";
import {
  isValidDate,
  validateDateRange,
  validateLimit,
} from "../common/validators.ts";

export function registerFinancialBaseTools(server: McpServer, sql: SQL): void {

  // ── 1. get_monthly_balance ─────────────────────────────────────────────

  server.tool(
    "get_monthly_balance",
    "Monthly cash-flow balance with income, real expenses and operational surplus. Separates events that distort operational reading (bill refunds, transfers). Use to understand month-over-month trend, diagnose if a result was distorted, or compare income vs expense over a period.",
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
            year: number; month: number;
            receitas_reais: string; estornos_fatura: string;
            despesas_reais: string; saldo_operacional: string;
            total_transacoes: string; transacoes_reais: string;
          }[]>`
            SELECT
              EXTRACT(YEAR  FROM date_day)::int AS year,
              EXTRACT(MONTH FROM date_day)::int AS month,
              ROUND(COALESCE(SUM(amount_signed)
                FILTER (WHERE transaction_kind = 'INCOME' AND is_real_cashflow), 0)::NUMERIC, 2)
                AS receitas_reais,
              ROUND(COALESCE(SUM(ABS(amount_signed))
                FILTER (WHERE transaction_kind = 'EXPENSE' AND NOT is_real_cashflow), 0)::NUMERIC, 2)
                AS estornos_fatura,
              ROUND(COALESCE(SUM(ABS(amount_signed))
                FILTER (WHERE transaction_kind IN ('EXPENSE','INVEST') AND is_real_cashflow), 0)::NUMERIC, 2)
                AS despesas_reais,
              ROUND(COALESCE(
                SUM(amount_signed) FILTER (WHERE transaction_kind = 'INCOME' AND is_real_cashflow)
                - SUM(ABS(amount_signed)) FILTER (WHERE transaction_kind IN ('EXPENSE','INVEST') AND is_real_cashflow),
              0)::NUMERIC, 2) AS saldo_operacional,
              COUNT(*) AS total_transacoes,
              COUNT(*) FILTER (WHERE is_real_cashflow) AS transacoes_reais
            FROM f_transacoes
            WHERE date_day >= ${start_date}::date AND date_day < ${end_date}::date
            GROUP BY 1, 2
            ORDER BY 1, 2
          `;
        });
        const result = rows.map((r) => ({
          year: Number(r.year),
          month: Number(r.month),
          receitas_reais: Number(r.receitas_reais),
          estornos_fatura: Number(r.estornos_fatura),
          despesas_reais: Number(r.despesas_reais),
          saldo_operacional: Number(r.saldo_operacional),
          total_transacoes: Number(r.total_transacoes),
          transacoes_reais: Number(r.transacoes_reais),
        }));
        return toolSuccess(result);
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 2. get_top_categories ──────────────────────────────────────────────

  server.tool(
    "get_top_categories",
    "Category ranking by spending weight in a period. Shows total, count, percentage share and average ticket. Use to find the heaviest spending categories, identify where to cut, or see which category rose most in the period.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      start_date: z.string().describe("Start date inclusive (YYYY-MM-DD)"),
      end_date: z.string().describe("End date exclusive (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(200).default(20).describe("Max rows returned (default 20, max 200)"),
      cashflow_type: z.enum(["real", "all"]).default("real").describe("real=is_real_cashflow only, all=all transactions"),
    },
    async ({ tenant_id, start_date, end_date, limit, cashflow_type }) => {
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
          return tx<{
            categoria: string | null; grupo: string | null;
            total: string; quantidade: string; percentual: string; ticket_medio: string;
          }[]>`
            WITH base AS (
              SELECT
                COALESCE(category_pt, 'Sem categoria') AS categoria,
                COALESCE(category_group_pt, 'Outros') AS grupo,
                ABS(amount_signed) AS valor
              FROM f_transacoes
              WHERE date_day >= ${start_date}::date AND date_day < ${end_date}::date
                AND transaction_kind = 'EXPENSE'
                AND (${cashflow_type} = 'all' OR is_real_cashflow = true)
            ),
            agg AS (
              SELECT
                categoria, grupo,
                ROUND(SUM(valor)::NUMERIC, 2) AS total,
                COUNT(*) AS quantidade,
                ROUND(AVG(valor)::NUMERIC, 2) AS ticket_medio
              FROM base
              GROUP BY categoria, grupo
            ),
            grand AS (SELECT SUM(total) AS grand_total FROM agg)
            SELECT
              a.categoria, a.grupo, a.total, a.quantidade,
              ROUND(100.0 * a.total / NULLIF(g.grand_total, 0), 2) AS percentual,
              a.ticket_medio
            FROM agg a, grand g
            ORDER BY a.total DESC
            LIMIT ${limit}
          `;
        });
        const result = rows.map((r) => ({
          categoria: r.categoria ?? "Sem categoria",
          grupo: r.grupo ?? "Outros",
          total: Number(r.total),
          quantidade: Number(r.quantidade),
          percentual: Number(r.percentual),
          ticket_medio: Number(r.ticket_medio),
        }));
        return toolSuccess(result);
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 3. get_daily_spending_breakdown ────────────────────────────────────

  server.tool(
    "get_daily_spending_breakdown",
    "Monthly spending broken into economic buckets: fixed installments, energy/utility bills, interest/fines, subscriptions and day-to-day. Use to separate fixed vs variable spending, identify the biggest source of pressure (debt, subscriptions or daily consumption) and find quick wins.",
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
            year: number; month: number; dias_com_gasto: string;
            parcelas_fixas: string; contas_energia: string; juros_multas: string;
            assinaturas: string; diaadia: string; total_despesas: string; receitas_reais: string;
          }[]>`
            WITH classified AS (
              SELECT
                EXTRACT(YEAR  FROM t.date_day)::int AS year,
                EXTRACT(MONTH FROM t.date_day)::int AS month,
                t.date_day,
                ABS(t.amount_signed) AS valor,
                t.transaction_kind,
                t.is_real_cashflow,
                CASE
                  WHEN p.transaction_id IS NOT NULL THEN 'parcelas_fixas'
                  WHEN t.category_group_pt ILIKE '%energia%'
                    OR t.category_group_pt ILIKE '%utilidade%'
                    OR t.category_group_pt ILIKE '%telecom%'
                    OR t.description ILIKE '%conta de luz%'
                    OR t.description ILIKE '%conta de agua%'
                    OR t.description ILIKE '%internet%' THEN 'contas_energia'
                  WHEN t.category_group_pt ILIKE '%juro%'
                    OR t.category_group_pt ILIKE '%multa%'
                    OR t.category_group_pt ILIKE '%financ%'
                    OR t.description ILIKE '%juros%'
                    OR t.description ILIKE '%multa%' THEN 'juros_multas'
                  WHEN ai.is_recurring = true
                    OR t.description ILIKE '%netflix%'
                    OR t.description ILIKE '%spotify%'
                    OR t.description ILIKE '%amazon prime%'
                    OR t.description ILIKE '%disney%'
                    OR t.description ILIKE '%hbo%'
                    OR t.description ILIKE '%apple%'
                    OR t.description ILIKE '%youtube%'
                    OR t.description ILIKE '%globo%'
                    OR t.description ILIKE '%assinatura%' THEN 'assinaturas'
                  ELSE 'diaadia'
                END AS bucket
              FROM f_transacoes t
              LEFT JOIN f_parcelas p ON p.transaction_id = t.transaction_id
              LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
              WHERE t.date_day >= ${start_date}::date AND t.date_day < ${end_date}::date
                AND t.transaction_kind IN ('EXPENSE', 'INVEST')
                AND t.is_real_cashflow = true
            ),
            income AS (
              SELECT
                EXTRACT(YEAR  FROM date_day)::int AS year,
                EXTRACT(MONTH FROM date_day)::int AS month,
                ROUND(COALESCE(SUM(amount_signed), 0)::NUMERIC, 2) AS receitas_reais
              FROM f_transacoes
              WHERE date_day >= ${start_date}::date AND date_day < ${end_date}::date
                AND transaction_kind = 'INCOME' AND is_real_cashflow = true
              GROUP BY 1, 2
            )
            SELECT
              c.year, c.month,
              COUNT(DISTINCT c.date_day)::text AS dias_com_gasto,
              ROUND(COALESCE(SUM(c.valor) FILTER (WHERE c.bucket = 'parcelas_fixas'), 0)::NUMERIC, 2) AS parcelas_fixas,
              ROUND(COALESCE(SUM(c.valor) FILTER (WHERE c.bucket = 'contas_energia'),  0)::NUMERIC, 2) AS contas_energia,
              ROUND(COALESCE(SUM(c.valor) FILTER (WHERE c.bucket = 'juros_multas'),    0)::NUMERIC, 2) AS juros_multas,
              ROUND(COALESCE(SUM(c.valor) FILTER (WHERE c.bucket = 'assinaturas'),     0)::NUMERIC, 2) AS assinaturas,
              ROUND(COALESCE(SUM(c.valor) FILTER (WHERE c.bucket = 'diaadia'),         0)::NUMERIC, 2) AS diaadia,
              ROUND(COALESCE(SUM(c.valor), 0)::NUMERIC, 2) AS total_despesas,
              COALESCE(i.receitas_reais, 0) AS receitas_reais
            FROM classified c
            LEFT JOIN income i ON i.year = c.year AND i.month = c.month
            GROUP BY c.year, c.month, i.receitas_reais
            ORDER BY c.year, c.month
          `;
        });
        const result = rows.map((r) => ({
          year: Number(r.year),
          month: Number(r.month),
          dias_com_gasto: Number(r.dias_com_gasto),
          parcelas_fixas: Number(r.parcelas_fixas),
          contas_energia: Number(r.contas_energia),
          juros_multas: Number(r.juros_multas),
          assinaturas: Number(r.assinaturas),
          diaadia: Number(r.diaadia),
          total_despesas: Number(r.total_despesas),
          receitas_reais: Number(r.receitas_reais),
        }));
        return toolSuccess(result);
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 4. get_spending_by_day_of_week ─────────────────────────────────────

  server.tool(
    "get_spending_by_day_of_week",
    "Spending pattern aggregated by day of week: total, count and average ticket per day. Use to detect if spending concentrates on weekends, which day has the worst ticket average, or where delivery and grocery spending peaks.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      start_date: z.string().describe("Start date inclusive (YYYY-MM-DD)"),
      end_date: z.string().describe("End date exclusive (YYYY-MM-DD)"),
      category_filter: z.array(z.string()).optional().describe("Optional list of category names to include"),
    },
    async ({ tenant_id, start_date, end_date, category_filter }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);
      if (!isValidDate(start_date)) return toolError(`Invalid start_date: ${start_date}`);
      if (!isValidDate(end_date)) return toolError(`Invalid end_date: ${end_date}`);
      const rangeErr = validateDateRange(start_date, end_date);
      if (rangeErr) return toolError(rangeErr);

      try {
        const rows = await withTenant(sql, tenant_id, async (tx) => {
          const cats = category_filter && category_filter.length > 0 ? category_filter : null;
          return tx<{ dia_semana: string; dow_num: string; total: string; quantidade: string; ticket_medio: string }[]>`
            SELECT
              TRIM(TO_CHAR(date_day, 'Day')) AS dia_semana,
              EXTRACT(DOW FROM date_day)::int AS dow_num,
              ROUND(SUM(ABS(amount_signed))::NUMERIC, 2) AS total,
              COUNT(*) AS quantidade,
              ROUND(AVG(ABS(amount_signed))::NUMERIC, 2) AS ticket_medio
            FROM f_fluxo_caixa
            WHERE date_day >= ${start_date}::date AND date_day < ${end_date}::date
              AND transaction_kind = 'EXPENSE'
              AND (${cats}::text[] IS NULL OR category_pt = ANY(${cats}::text[]))
            GROUP BY dia_semana, dow_num
            ORDER BY dow_num
          `;
        });
        const result = rows.map((r) => ({
          dia_semana: r.dia_semana,
          total: Number(r.total),
          quantidade: Number(r.quantidade),
          ticket_medio: Number(r.ticket_medio),
        }));
        return toolSuccess(result);
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
