import { SQL } from "bun";
import { BunPgAdapter } from "../../../infrastructure/db/BunPgAdapter.ts";
import { TokenHttpAdapter } from "../../../infrastructure/token/TokenHttpAdapter.ts";
import { SyncUseCase } from "../../sync/SyncUseCase.ts";
import { jsonResponse, errorResponse } from "../helpers.ts";

export async function handleSync(_req: Request, tenantId: string, sql: SQL): Promise<Response> {
  const db = new BunPgAdapter(tenantId, sql);
  try {
    const tokenPort = new TokenHttpAdapter(tenantId);
    const useCase = new SyncUseCase({
      tokenPort,
      itemRepo: db.items,
      accountRepo: db.accounts,
      transactionRepo: db.transactions,
      investmentRepo: db.investments,
      investmentTransactionRepo: db.investmentTransactions,
      enrichTransactionRepo: db.enrichTransactions,
    });
    const summary = await useCase.run();
    let enrichQueued = 0;
    for (const txId of summary.transactionIds) {
      const txRows = await sql.begin(async (tx) => {
        await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
        return tx<{ date: string }[]>`SELECT date::text AS date FROM transactions WHERE id = ${txId} LIMIT 1`;
      });
      const txDate = txRows[0]?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const ok = await db.jobQueue.enqueue("enrich", tenantId, { transaction_id: txId, date: txDate }, txDate, 10);
      if (ok) enrichQueued++;
    }
    const { transactionIds: _, ...rest } = summary;
    return jsonResponse({ ...rest, enrich_queued: enrichQueued });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg, 500);
  }
}
