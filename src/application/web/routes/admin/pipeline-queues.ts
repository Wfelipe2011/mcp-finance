import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";
import { isDigestEligible, DIGEST_COVERAGE_MIN } from "../../../../domain/digest-policy.ts";

type QueueRequestBody = { tenant_id?: unknown; month?: unknown };

async function readQueueRequestBody(req: Request): Promise<QueueRequestBody> {
  try {
    return (await req.json()) as QueueRequestBody;
  } catch {
    return {};
  }
}

async function getTargetTenantIds(db: BunPgAdapter, tenantId?: string): Promise<string[]> {
  const activeTenantIds = await db.getActiveTenantsIds();
  if (!tenantId) return activeTenantIds;
  return activeTenantIds.includes(tenantId) ? [tenantId] : [];
}

// ── Digest Queue ───────────────────────────────────────────────────────────

export async function handleDigestEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const rootDb = new BunPgAdapter(undefined, sql);
  const body = await readQueueRequestBody(req);
  const tenantId = typeof body.tenant_id === "string" && body.tenant_id ? body.tenant_id : undefined;
  const tenantIds = await getTargetTenantIds(rootDb, tenantId);
  if (tenantId && tenantIds.length === 0) return errorResponse("Tenant ativo não encontrado", 404);
  let bodyMonth: { year: number; month: number } | null = null;
  if (typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month)) {
    const [y, m] = body.month.split("-").map(Number);
    bodyMonth = { year: y!, month: m! };
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

export async function handleEnrichEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const body = await readQueueRequestBody(req);
  const tenantId = typeof body.tenant_id === "string" && body.tenant_id ? body.tenant_id : undefined;
  const tenantIds = await getTargetTenantIds(db, tenantId);
  if (tenantId && tenantIds.length === 0) return errorResponse("Tenant ativo não encontrado", 404);

  let enqueued = 0;
  for (const id of tenantIds) {
    try {
      enqueued += await db.enrich_jobs.enqueue(id, []);
    } catch {
      // segue com os demais tenants
    }
  }

  return jsonResponse({ enqueued, tenants: tenantIds.length });
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

// ── Daily Insight Queue ────────────────────────────────────────────────────

export async function handleDailyInsightEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const tenantIds = await db.getActiveTenantsIds();
  const today = new Date().toISOString().slice(0, 10);

  let inserted = 0;
  for (const tenantId of tenantIds) {
    const rows = await sql`
      INSERT INTO daily_insight_jobs (tenant_id, job_date)
      VALUES (${tenantId}::uuid, ${today}::date)
      ON CONFLICT (tenant_id, job_date) DO NOTHING
      RETURNING id
    `;
    inserted += rows.length;
  }

  return jsonResponse({ enqueued: inserted, tenants: tenantIds.length, date: today });
}

export async function handleDailyInsightQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const rows = await sql<{ status: string; cnt: string }[]>`
    SELECT status, COUNT(*) AS cnt FROM daily_insight_jobs GROUP BY status
  `;
  const c: Record<string, number> = {};
  for (const r of rows) c[r.status] = parseInt(r.cnt, 10);
  return jsonResponse({
    pending: c['pending'] ?? 0,
    running: c['running'] ?? 0,
    done:    c['done']    ?? 0,
    error:   c['error']  ?? 0,
  });
}
