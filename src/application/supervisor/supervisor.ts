import { SQL } from "bun";
import type { WorkerRow } from "../../infrastructure/db/BunPgAdapter.ts";

const RECONCILE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ERROR_COUNT = 5;

interface ChildProcess {
  proc: ReturnType<typeof Bun.spawn>;
  workerId: string;
}

const running = new Map<string, ChildProcess>();

function getDbUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL não configurado");
  return url;
}

async function findActiveWorkers(): Promise<WorkerRow[]> {
  const sql = new SQL(getDbUrl());
  try {
    return await sql<WorkerRow[]>`
      SELECT id, name, ai_base_url, ai_api_key, ai_model, status, error_count,
             last_error, jobs_done, last_seen_at, created_at
      FROM workers
      WHERE status IN ('idle', 'busy')
      ORDER BY created_at ASC
    `;
  } finally {
    await sql.close();
  }
}

async function incrementErrorCount(workerId: string): Promise<number> {
  const sql = new SQL(getDbUrl());
  try {
    const rows = await sql<{ error_count: number }[]>`
      UPDATE workers
      SET error_count  = error_count + 1,
          last_seen_at = NOW()
      WHERE id = ${workerId}::uuid
      RETURNING error_count
    `;
    return rows[0]?.error_count ?? 0;
  } finally {
    await sql.close();
  }
}

async function setWorkerStatus(workerId: string, status: string): Promise<void> {
  const sql = new SQL(getDbUrl());
  try {
    await sql`
      UPDATE workers SET status = ${status} WHERE id = ${workerId}::uuid
    `;
  } finally {
    await sql.close();
  }
}

function spawnWorker(worker: WorkerRow): ReturnType<typeof Bun.spawn> {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    DATABASE_URL: process.env["DATABASE_URL"] ?? "",
    AI_BASE_URL:  worker.ai_base_url,
    AI_MODEL:     worker.ai_model,
    WORKER_ID:    worker.id,
  };
  if (worker.ai_api_key) env["AI_API_KEY"] = worker.ai_api_key;

  const proc = Bun.spawn(
    ["bun", "run", "src/application/workers/enrich-worker.ts"],
    {
      cwd: process.cwd(),
      env,
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  proc.exited.then(async (exitCode) => {
    const entry = running.get(worker.id);
    if (!entry) return; // already removed by reconcile

    console.log(`[supervisor] Worker ${worker.name} (${worker.id}) exited with code ${exitCode}`);

    if (exitCode !== 0) {
      running.delete(worker.id);
      try {
        const newCount = await incrementErrorCount(worker.id);
        if (newCount >= MAX_ERROR_COUNT) {
          console.log(`[supervisor] Worker ${worker.name} atingiu ${newCount} erros → status='error'`);
          await setWorkerStatus(worker.id, "error");
        } else {
          console.log(`[supervisor] Worker ${worker.name} error_count=${newCount}, aguardando reconcile`);
        }
      } catch (err) {
        console.error(`[supervisor] Erro ao atualizar worker ${worker.id}:`, err);
      }
    } else {
      running.delete(worker.id);
    }
  });

  return proc;
}

async function reconcile(): Promise<void> {
  console.log("[supervisor] Reconciling workers...");
  let activeWorkers: WorkerRow[];
  try {
    activeWorkers = await findActiveWorkers();
  } catch (err) {
    console.error("[supervisor] Erro ao buscar workers:", err);
    return;
  }

  const activeIds = new Set(activeWorkers.map((w) => w.id));

  // Kill processes whose workers are no longer active in DB
  for (const [workerId, { proc, workerId: wId }] of running) {
    if (!activeIds.has(workerId)) {
      console.log(`[supervisor] Worker ${wId} não está mais ativo → killing process`);
      proc.kill();
      running.delete(workerId);
    }
  }

  // Spawn new processes for active workers not yet running
  for (const worker of activeWorkers) {
    if (!running.has(worker.id)) {
      console.log(`[supervisor] Spawning worker ${worker.name} (${worker.id})`);
      const proc = spawnWorker(worker);
      running.set(worker.id, { proc, workerId: worker.id });
    }
  }

  console.log(`[supervisor] Running: ${running.size} worker(s)`);
}

// Initial reconcile + interval
console.log("[supervisor] Starting...");
reconcile().catch(console.error);
setInterval(() => reconcile().catch(console.error), RECONCILE_INTERVAL_MS);
