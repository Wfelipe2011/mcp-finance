import { SQL } from "bun";
import { BunPgAdapter } from "../../../../infrastructure/db/BunPgAdapter.ts";
import { requireSuperAdmin } from "../../auth-middleware.ts";
import { jsonResponse, errorResponse } from "../../helpers.ts";

// ── Digest Queue ───────────────────────────────────────────────────────────

export async function handleDigestEnqueue(req: Request, sql: SQL): Promise<Response> {
  const auth = await requireSuperAdmin(req);
  if (!auth.valid) return errorResponse("Forbidden", auth.status);

  const rootDb = new BunPgAdapter(undefined, sql);
  const tenantIds = await rootDb.getActiveTenantsIds();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const toEnqueue: { id: string; year: number; month: number }[] = [];

  for (const tenantId of tenantIds) {
    const db = new BunPgAdapter(tenantId, sql);
    try {
      const coverage = await db.getDigestCoverage(year, month);
      if (coverage.total > 0 && coverage.enriched >= coverage.total) {
        toEnqueue.push({ id: tenantId, year, month });
      }
    } catch {
      // skip tenant on error
    }
  }

  const inserted = toEnqueue.length > 0 ? await rootDb.digest_jobs.enqueue(toEnqueue) : 0;

  return jsonResponse({
    enqueued: inserted,
    eligible: toEnqueue.length,
    year,
    month,
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
