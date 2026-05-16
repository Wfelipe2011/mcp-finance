import type { SQL } from "bun";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolError, toolSuccess } from "../common/errors.ts";
import { validateTenant, withTenant } from "../common/db.ts";

export function registerAiMlOpsTools(server: McpServer, sql: SQL): void {

  // ── 10. get_digest_status ──────────────────────────────────────────────

  server.tool(
    "get_digest_status",
    "Status of the monthly AI digest (narrative analysis) and enrichment coverage for a given month. Returns ready/pending/missing, enrichment ratio and digest metadata when available. Use to diagnose why an AI narrative did not appear, check enrichment coverage, or find when the last digest was generated.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
      year: z.number().int().min(2020).max(2100).describe("Year (e.g. 2025)"),
      month: z.number().int().min(1).max(12).describe("Month number (1-12)"),
    },
    async ({ tenant_id, year, month }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);

      try {
        const data = await withTenant(sql, tenant_id, async (tx) => {
          const coverageRows = await tx<[{ total: string; enriched: string }]>`
            SELECT
              COUNT(*) AS total,
              COUNT(ai.transaction_id) AS enriched
            FROM f_transacoes t
            LEFT JOIN ai_transaction_insights ai ON ai.transaction_id = t.transaction_id
            WHERE EXTRACT(YEAR  FROM t.date_day) = ${year}
              AND EXTRACT(MONTH FROM t.date_day) = ${month}
          `;

          const digestRows = await tx<{
            digest_at: string; model_version: string | null; flags: string[] | null;
          }[]>`
            SELECT digest_at::text, model_version, flags
            FROM ai_monthly_digest
            WHERE year = ${year} AND month = ${month}
            LIMIT 1
          `;

          return { coverageRows, digestRows };
        });

        const coverage = data.coverageRows[0] ?? { total: "0", enriched: "0" };
        const total = parseInt(coverage.total, 10);
        const enriched = parseInt(coverage.enriched, 10);
        const ratio = total > 0 ? Math.round((enriched / total) * 10000) / 10000 : 0;

        const digestRow = data.digestRows[0];
        const digestStatus: "ready" | "pending" | "missing" =
          digestRow ? "ready" : total === 0 ? "missing" : "pending";

        return toolSuccess({
          status: digestStatus,
          coverage: { total, enriched, ratio },
          digest: digestRow
            ? {
                digest_at: digestRow.digest_at,
                model_version: digestRow.model_version,
                flags: digestRow.flags,
              }
            : null,
        });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 11. get_forecast_status ────────────────────────────────────────────

  server.tool(
    "get_forecast_status",
    "ML forecast availability and quality for a tenant. Returns whether a forecast exists, the latest training metadata (MAE, MAPE, status) and a summary of upcoming predictions by group. Use to check if forecast is available for next month, when the model last trained, and if quality metrics allow trusting the projection.",
    {
      tenant_id: z.string().describe("Tenant UUID"),
    },
    async ({ tenant_id }) => {
      const tenantErr = await validateTenant(sql, tenant_id);
      if (tenantErr) return toolError(tenantErr);

      try {
        const data = await withTenant(sql, tenant_id, async (tx) => {
          const metaRows = await tx<{
            trained_at: string; months_of_history: number | null; num_categories: number | null;
            mae: string | null; mape: string | null; status: string; error_message: string | null;
          }[]>`
            SELECT
              trained_at::text, months_of_history, num_categories,
              mae::text, mape::text, status, error_message
            FROM forecast_model_meta
            WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
            ORDER BY trained_at DESC
            LIMIT 1
          `;

          const predRows = await tx<{
            target_year: number; target_month: number; group_pt: string;
            predicted_total: string; lower_bound: string; upper_bound: string;
          }[]>`
            SELECT
              target_year, target_month, group_pt,
              ROUND(SUM(predicted_amount)::NUMERIC, 2)::text AS predicted_total,
              ROUND(SUM(lower_bound)::NUMERIC, 2)::text AS lower_bound,
              ROUND(SUM(upper_bound)::NUMERIC, 2)::text AS upper_bound
            FROM forecast_predictions
            WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
              AND target_year * 100 + target_month >= EXTRACT(YEAR FROM NOW())::int * 100 + EXTRACT(MONTH FROM NOW())::int
            GROUP BY target_year, target_month, group_pt
            ORDER BY target_year, target_month, SUM(predicted_amount) DESC
          `;

          return { metaRows, predRows };
        });

        const meta = data.metaRows[0];
        const hasForecast = data.predRows.length > 0;

        const targetMonths = [
          ...new Set(
            data.predRows.map((r) => `${r.target_year}-${String(r.target_month).padStart(2, "0")}`),
          ),
        ];

        const groups = data.predRows.map((r) => ({
          target_month: `${r.target_year}-${String(r.target_month).padStart(2, "0")}`,
          group_pt: r.group_pt,
          predicted_total: Number(r.predicted_total),
          lower_bound: Number(r.lower_bound),
          upper_bound: Number(r.upper_bound),
        }));

        return toolSuccess({
          has_forecast: hasForecast,
          latest_model_meta: meta
            ? {
                trained_at: meta.trained_at,
                months_of_history: meta.months_of_history,
                num_categories: meta.num_categories,
                mae: meta.mae !== null ? Number(meta.mae) : null,
                mape: meta.mape !== null ? Number(meta.mape) : null,
                status: meta.status,
                error_message: meta.error_message,
              }
            : null,
          predictions_summary: { target_months: targetMonths, groups },
        });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );

  // ── 12. get_pipeline_health ────────────────────────────────────────────

  server.tool(
    "get_pipeline_health",
    "Operational view of AI/ML pipeline queues and workers. Shows worker status and queue counters for enrich, digest, forecast and ML training jobs. Use to diagnose AI processing delays, find offline workers with errors, or identify which queue is the bottleneck.",
    {
      tenant_id: z.string().optional().describe("Optional tenant UUID — scopes diagnostics to one tenant when provided"),
      include_global: z.boolean().default(true).describe("Include global worker and queue stats (default true)"),
    },
    async ({ tenant_id, include_global }) => {
      // Tenant validation only if tenant_id is provided
      if (tenant_id) {
        const tenantErr = await validateTenant(sql, tenant_id);
        if (tenantErr) return toolError(tenantErr);
      }

      try {
        // Workers and queues are global (not RLS-protected with tenant scope)
        const workerRows = await sql<{
          id: string; name: string; kind: string; status: string;
          error_count: number; jobs_done: number; last_seen_at: string | null;
        }[]>`
          SELECT id, name, kind, status, error_count, jobs_done, last_seen_at::text
          FROM workers
          ORDER BY status, name
        `;

        const enrichStats = await sql<[{ pending: string; running: string; done: string; error: string }]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
            COUNT(*) FILTER (WHERE status = 'running')::text AS running,
            COUNT(*) FILTER (WHERE status = 'done')::text AS done,
            COUNT(*) FILTER (WHERE status = 'error')::text AS error
          FROM enrich_jobs
          ${tenant_id ? sql`WHERE tenant_id = ${tenant_id}::uuid` : sql``}
        `;

        const digestStats = await sql<[{ pending: string; running: string; done: string; error: string; skipped: string }]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
            COUNT(*) FILTER (WHERE status = 'running')::text AS running,
            COUNT(*) FILTER (WHERE status = 'done')::text AS done,
            COUNT(*) FILTER (WHERE status = 'error')::text AS error,
            COUNT(*) FILTER (WHERE status = 'skipped')::text AS skipped
          FROM digest_jobs
          ${tenant_id ? sql`WHERE tenant_id = ${tenant_id}::uuid` : sql``}
        `;

        const forecastStats = await sql<[{ pending: string; running: string; done: string; error: string }]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
            COUNT(*) FILTER (WHERE status = 'running')::text AS running,
            COUNT(*) FILTER (WHERE status = 'done')::text AS done,
            COUNT(*) FILTER (WHERE status = 'error')::text AS error
          FROM forecast_jobs
          ${tenant_id ? sql`WHERE tenant_id = ${tenant_id}::uuid` : sql``}
        `;

        const mlStats = await sql<[{ pending: string; running: string; done: string; error: string }]>`
          SELECT
            COUNT(*) FILTER (WHERE status = 'pending')::text AS pending,
            COUNT(*) FILTER (WHERE status = 'running')::text AS running,
            COUNT(*) FILTER (WHERE status = 'done')::text AS done,
            COUNT(*) FILTER (WHERE status = 'error')::text AS error
          FROM ml_training_jobs
          ${tenant_id ? sql`WHERE tenant_id = ${tenant_id}::uuid` : sql``}
        `;

        // Diagnostics: stuck jobs (running > 30 minutes)
        const stuckRows = await sql<{ job_type: string; id: number; tenant_id: string; started_at: string }[]>`
          SELECT 'enrich' AS job_type, id, tenant_id::text, started_at::text
          FROM enrich_jobs WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'
          UNION ALL
          SELECT 'digest', id, tenant_id::text, started_at::text
          FROM digest_jobs WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'
          UNION ALL
          SELECT 'forecast', id, tenant_id::text, started_at::text
          FROM forecast_jobs WHERE status = 'running' AND started_at < NOW() - INTERVAL '30 minutes'
        `;

        const recentErrors = await sql<{ job_type: string; id: number; error_msg: string | null; updated_at: string }[]>`
          SELECT 'enrich' AS job_type, id, error_msg, finished_at::text AS updated_at
          FROM enrich_jobs WHERE status = 'error'
          ${tenant_id ? sql`AND tenant_id = ${tenant_id}::uuid` : sql``}
          ORDER BY finished_at DESC NULLS LAST LIMIT 5
        `;

        const e = enrichStats[0]!;
        const d = digestStats[0]!;
        const f = forecastStats[0]!;
        const ml = mlStats[0]!;

        return toolSuccess({
          workers: workerRows.map((w) => ({
            id: w.id,
            name: w.name,
            kind: w.kind,
            status: w.status,
            error_count: w.error_count,
            jobs_done: w.jobs_done,
            last_seen_at: w.last_seen_at,
          })),
          queues: {
            enrich_jobs: { pending: Number(e.pending), running: Number(e.running), done: Number(e.done), error: Number(e.error) },
            digest_jobs: { pending: Number(d.pending), running: Number(d.running), done: Number(d.done), error: Number(d.error), skipped: Number(d.skipped) },
            forecast_jobs: { pending: Number(f.pending), running: Number(f.running), done: Number(f.done), error: Number(f.error) },
            ml_training_jobs: { pending: Number(ml.pending), running: Number(ml.running), done: Number(ml.done), error: Number(ml.error) },
          },
          diagnostics: {
            stuck_jobs: stuckRows,
            recent_errors: recentErrors,
          },
        });
      } catch (err) {
        return toolError(`Query failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
  );
}
