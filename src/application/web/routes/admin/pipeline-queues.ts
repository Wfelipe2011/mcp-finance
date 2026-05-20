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

  let inserted = 0;
  for (const t of toEnqueue) {
    const refDate = `${t.year}-${String(t.month).padStart(2, "0")}-01`;
    const ok = await rootDb.jobQueue.enqueue("digest", t.id, { year: t.year, month: t.month }, refDate, 20);
    if (ok) inserted++;
  }

  const months = [...new Set(toEnqueue.map((t) => `${t.year}-${String(t.month).padStart(2, "0")}`))]
    .sort();

  return jsonResponse({
    enqueued: inserted,
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
      const txRows = await sql.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${id}, true)`;
        return tx<{ date: string; transaction_id: string }[]>`
          SELECT t.date::text AS date, t.id AS transaction_id
          FROM transactions t
          WHERE t.tenant_id = ${id}::uuid
            AND NOT EXISTS (
              SELECT 1 FROM ai_transaction_insights ai WHERE ai.transaction_id = t.id
            )
          ORDER BY t.date DESC
        `;
      });
      for (const tx of txRows) {
        const txDate = tx.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
        const ok = await db.jobQueue.enqueue("enrich", id, { transaction_id: tx.transaction_id, date: txDate }, txDate, 10);
        if (ok) enqueued++;
      }
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
  const stats = await db.jobQueue.getStatsByType("digest");
  return jsonResponse(stats[0] ?? { job_type: "digest", pending: 0, running: 0, done: 0, error: 0, skipped: 0 });
}

// ── Forecast Queue ─────────────────────────────────────────────────────────

export async function handleForecastEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const tenantIds = await db.getActiveTenantsIds();
  const today = new Date().toISOString().slice(0, 10);

  let inserted = 0;
  for (const id of tenantIds) {
    const ok = await db.jobQueue.enqueue("forecast", id, { job_date: today }, today, 30);
    if (ok) inserted++;
  }

  return jsonResponse({ enqueued: inserted, date: today });
}

export async function handleForecastQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.jobQueue.getStatsByType("forecast");
  return jsonResponse(stats[0] ?? { job_type: "forecast", pending: 0, running: 0, done: 0, error: 0, skipped: 0 });
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
    const ok = await db.jobQueue.enqueue("daily_insight", tenantId, { job_date: today }, today, 0);
    if (ok) inserted++;
  }

  return jsonResponse({ enqueued: inserted, tenants: tenantIds.length, date: today });
}

export async function handleDailyInsightQueueStats(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const db = new BunPgAdapter(undefined, sql);
  const stats = await db.jobQueue.getStatsByType("daily_insight");
  return jsonResponse(stats[0] ?? { job_type: "daily_insight", pending: 0, running: 0, done: 0, error: 0, skipped: 0 });
}
