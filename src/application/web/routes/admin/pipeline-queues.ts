import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";
import { isDigestEligible, DIGEST_COVERAGE_MIN } from "../../../../domain/digest-policy.ts";

// ── Digest Queue ───────────────────────────────────────────────────────────

export async function handleDigestEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const rootDb = new BunPgAdapter(undefined, sql);
  const tenantIds = await rootDb.getActiveTenantsIds();

  let bodyMonth: { year: number; month: number } | null = null;
  try {
    const body = await req.json();
    if (typeof body?.month === "string" && /^\d{4}-\d{2}$/.test(body.month)) {
      const [y, m] = body.month.split("-").map(Number);
      bodyMonth = { year: y!, month: m! };
    }
  } catch {
    // body ausente ou inválido — varredura completa
  }

  const toEnqueue: { id: string; year: number; month: number }[] = [];

  for (const tenantId of tenantIds) {
    const db = new BunPgAdapter(tenantId, sql);
    try {
      if (bodyMonth) {
        const { year, month } = bodyMonth;
        const coverage = await db.getDigestCoverage(year, month);
        if (isDigestEligible(coverage.enriched, coverage.total)) {
          toEnqueue.push({ id: tenantId, year, month });
        }
      } else {
        const eligible = await db.getEligibleMonthsForDigest();
        for (const { year, month } of eligible) {
          toEnqueue.push({ id: tenantId, year, month });
        }
      }
    } catch {
      // skip tenant on error
    }
  }

  const inserted = toEnqueue.length > 0 ? await rootDb.digest_jobs.enqueue(toEnqueue) : 0;

  // Resetar jobs com status 'error' para 'pending' para que sejam reprocessados
  let reset = 0;
  if (toEnqueue.length > inserted) {
    for (const t of toEnqueue) {
      const rows = await sql`
        UPDATE digest_jobs
        SET status = 'pending', started_at = NULL, worker_id = NULL, finished_at = NULL
        WHERE tenant_id = ${t.id}::uuid
          AND year = ${t.year}
          AND month = ${t.month}
          AND status = 'error'
        RETURNING id
      `;
      reset += rows.length;
    }
  }

  const months = [...new Set(toEnqueue.map((t) => `${t.year}-${String(t.month).padStart(2, "0")}`))]
    .sort();

  return jsonResponse({
    enqueued: inserted + reset,
    eligible: toEnqueue.length,
    coverage_min: DIGEST_COVERAGE_MIN,
    months,
  });
}

export async function handleDigestQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.digest_jobs.getQueueStats();
  return jsonResponse(stats);
}

// ── Forecast Queue ─────────────────────────────────────────────────────────

export async function handleForecastEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const tenantIds = await db.getActiveTenantsIds();
  const today = new Date().toISOString().slice(0, 10);

  const tenants = tenantIds.map((id) => ({ id }));
  const inserted = tenants.length > 0 ? await db.forecast_jobs.enqueue(tenants, today) : 0;

  return jsonResponse({ enqueued: inserted, date: today });
}

export async function handleForecastQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.forecast_jobs.getQueueStats();
  return jsonResponse(stats);
}

// ── ML Training Queue ──────────────────────────────────────────────────────

export async function handleMlEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const tenantIds = await db.getActiveTenantsIds();

  const tenants = tenantIds.map((id) => ({ id }));
  const inserted = tenants.length > 0 ? await db.ml_training_jobs.enqueue(tenants) : 0;

  return jsonResponse({ enqueued: inserted });
}

export async function handleMlQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.ml_training_jobs.getQueueStats();
  return jsonResponse(stats);
}
